// app/api/ai/chat-document/route.ts
// Single-document RAG chat: embed question → cosine search ONLY this doc's chunks → stream answer
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import { logger } from '@/lib/logging/redact'

export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const { documentId, question, history = [] } = await req.json()

        if (!documentId || !question) {
            return new Response(JSON.stringify({ error: 'Missing documentId or question' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Fetch document to get org_id
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                organization_id: true,
                ai_title: true,
                file_name: true,
                ai_summary: true,
                is_processed: true,
            },
        })

        if (!document) {
            return new Response(JSON.stringify({ error: 'Document not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Get AI service
        const ai = await getAIServiceForOrg(document.organization_id)

        // Try to find relevant chunks (may be empty if not processed yet)
        let context = ''
        const docTitle = document.ai_title || document.file_name

        if (document.is_processed) {
            // Embed the question
            const questionEmbedding = await ai.generateEmbedding(question)
            const vectorStr = JSON.stringify(questionEmbedding)

            // Cosine similarity search — top 6 chunks from THIS document only
            const relevantChunks = await prisma.$queryRawUnsafe<
                {
                    chunk_id: string
                    content: string
                    similarity: number
                    page_start: number
                    page_end: number
                }[]
            >(
                `SELECT
                    dc.id AS chunk_id,
                    dc.content,
                    1 - (dc.embedding <=> $1::vector) AS similarity,
                    dc.page_number AS page_start,
                    COALESCE(dc.page_end, dc.page_number) AS page_end
                FROM document_chunks dc
                WHERE dc.document_id = $2::uuid
                  AND dc.embedding IS NOT NULL
                ORDER BY similarity DESC
                LIMIT 6`,
                vectorStr,
                documentId
            )

            context = relevantChunks
                .map(
                    (c, i) =>
                        `[Bagian ${i + 1}, Hal. ${c.page_start}${c.page_end !== c.page_start ? `-${c.page_end}` : ''}]\n${c.content}`
                )
                .join('\n\n---\n\n')
        }

        // System prompt scoped to this document
        const systemPrompt = `Anda adalah asisten AI yang membantu user memahami dokumen "${docTitle}".
${document.ai_summary ? `Ringkasan dokumen: ${document.ai_summary}` : ''}

ATURAN:
- Jawab pertanyaan HANYA berdasarkan konteks dokumen di bawah.
- Jika informasi tidak ditemukan, katakan "Informasi ini tidak ditemukan dalam dokumen ini."
- Sebutkan bagian/halaman relevan saat menjawab, contoh: (Hal. 3)
- Jawab dalam bahasa yang sama dengan pertanyaan.
- Gunakan format markdown jika perlu untuk kejelasan.
- Berikan jawaban yang ringkas dan langsung ke intinya.

KONTEKS DARI DOKUMEN:
${context || 'Tidak ada bagian dokumen yang relevan ditemukan.'}`

        // Build chat prompt
        const historyText = (history as { role: string; content: string }[])
            .slice(-8)
            .map((m) => `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}`)
            .join('\n')

        const fullPrompt = historyText
            ? `${historyText}\n\nUser: ${question}`
            : question

        // Stream response
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    await ai.streamCompletion(
                        fullPrompt,
                        systemPrompt,
                        (chunk: string) => {
                            try {
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
                                )
                            } catch { /* client disconnected */ }
                        }
                    )
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                } catch (err) {
                    logger.error('Document chat streaming error:', err)
                    const msg = err instanceof Error ? err.message : 'Unknown error'
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
                    )
                } finally {
                    try { controller.close() } catch { /* already closed */ }
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (err) {
        logger.error('Document chat error:', err)
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
