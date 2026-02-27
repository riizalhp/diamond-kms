// app/api/ai/chat-content/route.ts
// Single-article RAG chat: embed question → cosine search ONLY this article's chunks → stream answer
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import { logger } from '@/lib/logging/redact'

export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const { contentId, question, history = [] } = await req.json()

        if (!contentId || !question) {
            return new Response(JSON.stringify({ error: 'Missing contentId or question' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Fetch content to get org_id
        const content = await prisma.content.findUnique({
            where: { id: contentId },
            select: {
                id: true,
                organization_id: true,
                title: true,
                is_processed: true,
            },
        })

        if (!content) {
            return new Response(JSON.stringify({ error: 'Article not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Get AI service
        const ai = await getAIServiceForOrg(content.organization_id)

        // Try to find relevant chunks (may be empty if not processed yet)
        let ragContext = ''
        const docTitle = content.title

        if (content.is_processed) {
            // Embed the question
            const questionEmbedding = await ai.generateEmbedding(question)
            const vectorStr = JSON.stringify(questionEmbedding)

            // Cosine similarity search — top 4 chunks from THIS article only
            const relevantChunks = await prisma.$queryRawUnsafe<
                {
                    chunk_id: string
                    content: string
                    similarity: number
                }[]
            >(
                `SELECT
                    cc.id AS chunk_id,
                    cc.content,
                    1 - (cc.embedding <=> $1::vector) AS similarity
                FROM content_chunks cc
                WHERE cc.content_id = $2
                  AND cc.embedding IS NOT NULL
                ORDER BY similarity DESC
                LIMIT 4`,
                vectorStr,
                contentId
            )

            ragContext = relevantChunks
                .map((c, i) => `[Bagian Teks ${i + 1}]\n${c.content}`)
                .join('\n\n---\n\n')

            // Fetch Graph Entities & Relationships
            const entities = await prisma.contentEntity.findMany({
                where: { content_id: contentId },
                take: 15
            })
            const relationships = await prisma.contentRelationship.findMany({
                where: { content_id: contentId },
                include: { source_entity: true, target_entity: true },
                take: 30
            })

            if (entities.length > 0 || relationships.length > 0) {
                let graphContext = `[KNOWLEDGE GRAPH ENTITAS & RELASI]\n`
                if (entities.length > 0) {
                    graphContext += `Entitas Utama:\n` + entities.map((e: any) => `- ${e.name} (${e.type}): ${e.description || ''}`).join('\n') + '\n\n'
                }
                if (relationships.length > 0) {
                    graphContext += `Relasi Hubungan:\n` + relationships.map((r: any) => `- ${r.source_entity.name} [${r.relationship}] ${r.target_entity.name}${r.description ? ` (${r.description})` : ''}`).join('\n') + '\n\n'
                }
                ragContext = graphContext + `\n[KUTIPAN TEKS (Vector Search)]\n` + ragContext
            }
        }

        // System prompt scoped to this article
        const systemPrompt = `Anda adalah asisten AI yang membantu user memahami artikel Knowledge Base berjudul "${docTitle}".

ATURAN PENTING:
- Jawab pertanyaan HANYA berdasarkan konteks artikel di bawah, yang mencakup potongan teks dan graf pengetahuan entitas + relasinya.
- Jika informasi tidak ditemukan secara eksplisit dari teks, katakan "Informasi ini tidak dibahas dalam artikel ini."
- Berikan jawaban yang SERTA MERTA, ringkas, dan langsung ke intinya. DILARANG KERAS mengulang-ulang kalimat, poin, atau kesimpulan yang sama.
- JIKA Anda sudah memberikan kesimpulan atau ringkasan, SELESAIKAN jawaban Anda dan JANGAN menulis ulang kesimpulan.

KONTEKS DARI ARTIKEL:
${ragContext || 'Tidak ada teks artikel yang diproses AI ditemukan.'}`

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
                    logger.error('Article chat streaming error:', err)
                    const msg = err instanceof Error ? err.message : 'Unknown error'
                    const friendlyMsg = msg.includes('504')
                        ? 'Server AI mengalami Timeout (504). Beban artikel terlalu panjang atau server sedang sibuk.'
                        : msg
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`)
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
        logger.error('Article chat error:', err)
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
