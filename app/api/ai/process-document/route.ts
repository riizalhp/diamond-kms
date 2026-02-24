// app/api/ai/process-document/route.ts
// REPLACES dummy simulateAIProcessing() with real AI pipeline
// Pipeline: download file → extract text → AI metadata → chunk → embed → save
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/api/response'
import { logger } from '@/lib/logging/redact'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import { extractPDFText, extractPlainText } from '@/lib/ai/pdf-extractor'
import { chunkDocument } from '@/lib/ai/chunker'
import { env } from '@/lib/env'

export const maxDuration = 120 // Allow up to 2 minutes for large PDFs

export async function POST(req: NextRequest) {
    // Security: accept calls from internal server actions only
    const secret = req.headers.get('x-internal-secret')
    if (secret !== env.CRON_SECRET) {
        return ApiResponse.forbidden('process-document endpoint')
    }

    let documentId: string
    try {
        const body = await req.json()
        documentId = body.documentId
    } catch {
        return ApiResponse.validationError({ body: 'Invalid JSON' })
    }
    if (!documentId) {
        return ApiResponse.validationError({ documentId: 'required' })
    }

    // Fetch document from DB
    const document = await prisma.document.findUnique({
        where: { id: documentId },
    })
    if (!document) return ApiResponse.notFound('Document')

    try {
        // STEP 1: Read file content
        // For now, we work with files that were uploaded as text or via Supabase storage
        // Try Supabase Storage first, fallback to reading from file_path placeholder
        let fileBuffer: Buffer | null = null
        let extractedText = ''

        try {
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(
                env.NEXT_PUBLIC_SUPABASE_URL,
                env.SUPABASE_SERVICE_ROLE_KEY
            )
            const { data: fileData, error: dlErr } = await supabase.storage
                .from('documents')
                .download(document.file_path)

            if (!dlErr && fileData) {
                fileBuffer = Buffer.from(await fileData.arrayBuffer())
            }
        } catch (storageErr) {
            logger.warn('Supabase Storage download failed, attempting text extraction from metadata', storageErr)
        }

        // STEP 2: Extract text based on file type
        const isPDF = document.mime_type === 'application/pdf'
        const isText = ['text/plain', 'text/markdown', 'text/csv'].includes(
            document.mime_type
        )

        let pages: { pageNum: number; text: string }[]
        let pageCount: number

        if (fileBuffer && isPDF) {
            const extracted = await extractPDFText(fileBuffer)
            extractedText = extracted.fullText
            pages = extracted.pages
            pageCount = extracted.pageCount
        } else if (fileBuffer && isText) {
            const extracted = extractPlainText(fileBuffer, document.file_name)
            extractedText = extracted.fullText
            pages = extracted.pages
            pageCount = extracted.pageCount
        } else {
            // Fallback: create minimal content from file metadata
            extractedText = `Document: ${document.file_name} (${document.mime_type}, ${document.file_size} bytes). Content extraction not available for this file type.`
            pages = [{ pageNum: 1, text: extractedText }]
            pageCount = 1
        }

        logger.info(
            `Extracted ${pageCount} pages, ${extractedText.length} chars from ${document.file_name}`
        )

        // STEP 3: Get AI service for this organization
        const ai = await getAIServiceForOrg(document.organization_id)

        // STEP 4: Generate metadata (title, summary, tags)
        const metadata = await ai.generateDocumentMetadata({
            fileBuffer:
                ai.providerName === 'google-gemini' && isPDF && fileBuffer
                    ? fileBuffer
                    : undefined,
            text:
                ai.providerName !== 'google-gemini' || !isPDF || !fileBuffer
                    ? extractedText.slice(0, 30000)
                    : undefined,
            fileName: document.file_name,
        })

        // STEP 5: Update Document with AI metadata
        await prisma.document.update({
            where: { id: documentId },
            data: {
                ai_title: metadata.title,
                ai_summary: metadata.summary,
                ai_tags: metadata.tags,
                embedding_model: ai.embeddingModel,
            },
        })

        // STEP 6: Chunk document semantically
        const chunks = chunkDocument(pages)
        logger.info(`Created ${chunks.length} chunks for ${documentId}`)

        // STEP 7: Remove old chunks if re-processing
        await prisma.documentChunk.deleteMany({
            where: { document_id: documentId },
        })

        // STEP 8: Embed each chunk and save to DB
        const BATCH_SIZE = 5
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE)

            await Promise.all(
                batch.map(async (chunk) => {
                    const embedding = await ai.generateEmbedding(chunk.content)

                    // Prisma doesn't support vector type natively — use raw SQL
                    await prisma.$executeRawUnsafe(
                        `INSERT INTO document_chunks
              (id, document_id, chunk_index, content, embedding, token_count, page_number, page_end, created_at)
            VALUES
              (gen_random_uuid(), $1, $2, $3, $4::vector, $5, $6, $7, NOW())`,
                        documentId,
                        chunk.chunkIndex,
                        chunk.content,
                        JSON.stringify(embedding),
                        chunk.tokenCount,
                        chunk.pageStart,
                        chunk.pageEnd
                    )
                })
            )
        }

        // STEP 9: Mark document as processed
        await prisma.document.update({
            where: { id: documentId },
            data: {
                is_processed: true,
                embedding_version: { increment: 1 },
                processing_error: null,
            },
        })

        // STEP 10: Log AI usage
        const estimatedTokens =
            chunks.reduce((sum, c) => sum + c.tokenCount, 0) * 2
        await prisma.aIUsageLog.create({
            data: {
                organization_id: document.organization_id,
                user_id: document.uploaded_by,
                action_type: 'AUTO_TAG',
                tokens_used: estimatedTokens,
                model_used: ai.embeddingModel,
            },
        })

        logger.info(
            `Document ${documentId} processed successfully (${chunks.length} chunks, model: ${ai.providerName})`
        )
        return ApiResponse.ok({ processed: true, chunks: chunks.length })
    } catch (err) {
        // Graceful failure — document stays accessible, only AI features won't work
        logger.error(`AI processing failed for ${documentId}`, err)
        await prisma.document.update({
            where: { id: documentId },
            data: {
                is_processed: false,
                processing_error:
                    err instanceof Error ? err.message : 'Unknown processing error',
            },
        })
        return ApiResponse.internalError(err)
    }
}
