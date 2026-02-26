// app/api/ai/process-document/route.ts
// REPLACES dummy simulateAIProcessing() with real AI pipeline
// Pipeline: download file → extract text → AI metadata → chunk → embed → save
// NOW: writes progress to DB so clients can poll for status
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ApiResponse } from '@/lib/api/response'
import { logger } from '@/lib/logging/redact'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import { extractPDFText, extractPlainText } from '@/lib/ai/pdf-extractor'
import { chunkDocument } from '@/lib/ai/chunker'
import { env } from '@/lib/env'

export const maxDuration = 120 // Allow up to 2 minutes for large PDFs

// Helper to update processing log in DB
async function updateProcessingLog(
    documentId: string,
    status: string,
    message: string,
    progress: number,
    existingLog: any[] = []
) {
    const newEntry = { time: new Date().toISOString(), message, progress }
    const log = [...existingLog, newEntry]
    const logJson = JSON.stringify(log)
    // Use raw SQL to bypass Prisma type validation for newly added columns
    await prisma.$executeRaw`
        UPDATE documents
        SET processing_status = ${status},
            processing_log = ${logJson}::jsonb
        WHERE id = ${documentId}::uuid
    `
    return log
}

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

    if (!document) {
        return ApiResponse.notFound('Document')
    }

    // Run background processing without awaiting
    processDocumentInBackground(documentId, document).catch(err => {
        logger.error(`Critical failure in background processing for ${documentId}:`, err)
    })

    return NextResponse.json({ success: true, message: 'Processing started in background' })
}

async function processDocumentInBackground(documentId: string, document: any) {
    console.log(`\n🔄 [PROCESS] Starting background processing for ${documentId} (${document.file_name})`)
    let processingLog: any[] = []
    try {
        processingLog = await updateProcessingLog(documentId, 'processing', 'Memulai pemrosesan dokumen...', 5, processingLog)
        console.log(`✅ [PROCESS] DB log updated successfully for ${documentId}`)
    } catch (logErr) {
        console.error(`❌ [PROCESS] updateProcessingLog FAILED for ${documentId}:`, logErr)
        // Continue anyway — don't let log failure prevent processing
    }

    const sendEvent = (event: string, data: any) => {
        // Dummy function: SSE is no longer used, UI relies on DB polling
    }

    try {
        sendEvent('start', { message: 'Memulai pemrosesan dokumen...' })

        // STEP 1: Read file content
        const msg1 = 'Membaca dan mengekstrak teks dari file...'
        sendEvent('progress', { step: 'extracting', message: msg1, progress: 10 })
        processingLog = await updateProcessingLog(documentId, 'processing', msg1, 10, processingLog)

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
                console.log(`✅ [PROCESS] Downloaded file: ${document.file_path} (${fileBuffer.length} bytes)`)
            } else {
                console.log(`⚠️ [PROCESS] Download failed or no data: ${dlErr?.message || 'no fileData'}`)
            }
        } catch (storageErr: any) {
            console.error(`❌ [PROCESS] Supabase Storage download FAILED:`, storageErr?.message)
            logger.warn('Supabase Storage download failed', storageErr)
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
            extractedText = `Document: ${document.file_name} (${document.mime_type}, ${document.file_size} bytes). Content extraction not available for this file type.`
            pages = [{ pageNum: 1, text: extractedText }]
            pageCount = 1
        }

        console.log(`✅ [PROCESS] Extracted ${pageCount} pages, ${extractedText.length} chars from ${document.file_name}`)

        // STEP 3: Get AI service for this organization
        const msg3 = 'Membuat ringkasan, judul, dan kategori dengan AI...'
        sendEvent('progress', { step: 'metadata', message: msg3, progress: 30 })
        processingLog = await updateProcessingLog(documentId, 'processing', msg3, 30, processingLog)

        const ai = await getAIServiceForOrg(document.organization_id)
        console.log(`✅ [PROCESS] Got AI service: ${ai.providerName}, embedding: ${ai.embeddingModel}`)

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
        const msg6 = 'Memotong dokumen menjadi beberapa bagian indeks...'
        sendEvent('progress', { step: 'chunking', message: msg6, progress: 50 })
        processingLog = await updateProcessingLog(documentId, 'processing', msg6, 50, processingLog)

        const chunks = chunkDocument(pages)
        logger.info(`Created ${chunks.length} chunks for ${documentId}`)

        // STEP 7: Remove old chunks if re-processing
        await prisma.documentChunk.deleteMany({
            where: { document_id: documentId },
        })

        // STEP 8: Embed each chunk and save to DB
        const pLimit = (await import('p-limit')).default
        const limit = pLimit(4) // Max 4 concurrent embedding requests to prevent crashing local Ollama

        const totalChunks = chunks.length
        let processedChunks = 0

        await Promise.all(
            chunks.map((chunk, i) =>
                limit(async () => {
                    const currentProgress = 50 + Math.floor((processedChunks / totalChunks) * 40)
                    const embMsg = `Membuat vektor embeddings (Bagian ${processedChunks + 1}/${totalChunks})...`

                    // Only send progress updates for every 3rd chunk to avoid overwhelming the client/DB
                    if (processedChunks === 0 || processedChunks === totalChunks - 1 || processedChunks % 3 === 0) {
                        sendEvent('progress', { step: 'embedding', message: embMsg, progress: currentProgress })
                        processingLog = await updateProcessingLog(documentId, 'processing', embMsg, currentProgress, processingLog)
                    }

                    const embedding = await ai.generateEmbedding(chunk.content)
                    const embeddingString = `[${embedding.join(',')}]`
                    await prisma.$executeRaw`
                        INSERT INTO document_chunks
                        (id, document_id, chunk_index, content, embedding, token_count, page_number, page_end, created_at)
                        VALUES
                        (gen_random_uuid(), ${documentId}::uuid, ${chunk.chunkIndex}, ${chunk.content}, ${embeddingString}::vector, ${chunk.tokenCount}, ${chunk.pageStart}, ${chunk.pageEnd}, NOW())
                    `
                    processedChunks++
                })
            )
        )

        const msgFinal = 'Merapikan dan menyimpan hasil pemrosesan...'
        sendEvent('progress', { step: 'finalizing', message: msgFinal, progress: 95 })
        processingLog = await updateProcessingLog(documentId, 'processing', msgFinal, 95, processingLog)

        // STEP 9: Mark document as processed
        const msgDone = 'Pemrosesan dokumen selesai!'
        processingLog = [...processingLog, { time: new Date().toISOString(), message: msgDone, progress: 100 }]
        const finalLogJson = JSON.stringify(processingLog)

        // Use raw SQL for new columns + regular update for existing ones
        await prisma.$executeRaw`
            UPDATE documents
            SET is_processed = true,
                processing_status = 'completed',
                processing_log = ${finalLogJson}::jsonb,
                processing_error = NULL,
                embedding_version = embedding_version + 1
            WHERE id = ${documentId}::uuid
        `

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

        sendEvent('progress', { step: 'done', message: msgDone, progress: 100 })
        sendEvent('done', { success: true, processed: true, chunks: chunks.length })

    } catch (err) {
        console.error(`\n❌ [PROCESS] AI processing FAILED for ${documentId}:`, err)
        logger.error(`AI processing failed for ${documentId}`, err)
        const errMsg = err instanceof Error ? err.message : 'Unknown processing error'
        processingLog = [...processingLog, { time: new Date().toISOString(), message: `Error: ${errMsg}`, progress: 0 }]

        const errLogJson = JSON.stringify(processingLog)
        await prisma.$executeRaw`
            UPDATE documents
            SET is_processed = false,
                processing_status = 'failed',
                processing_log = ${errLogJson}::jsonb,
                processing_error = ${errMsg}
            WHERE id = ${documentId}::uuid
        `

        sendEvent('error', { message: errMsg })
    }
}
