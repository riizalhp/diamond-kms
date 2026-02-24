// lib/ai/rag-pipeline.ts
// Retrieval-Augmented Generation pipeline
// Question → embed → cosine search top-8 chunks → build context → stream LLM answer + citations
import prisma from '@/lib/prisma'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import type { Role } from '@prisma/client'

export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface Citation {
    documentId: string
    documentTitle: string
    pageStart: number
    pageEnd: number
    divisionName: string
    chunkContent: string // snippet for preview
}

export interface RAGQueryParams {
    question: string
    history: ChatMessage[]
    userId: string
    orgId: string
    userRole: Role
    divisionId: string
    crossDivisionEnabled: boolean
    onChunk: (text: string) => void
    signal?: AbortSignal
}

export async function ragQuery(
    params: RAGQueryParams
): Promise<Citation[]> {
    const {
        question,
        history,
        orgId,
        userRole,
        divisionId,
        crossDivisionEnabled,
        onChunk,
        signal,
    } = params

    // ── STEP 1: Scope filter based on role ──────────────────────
    const scopedToDiv =
        userRole === 'STAFF' ||
        (userRole === 'SUPERVISOR' && !crossDivisionEnabled)

    // ── STEP 2: Embed the question ──────────────────────────────
    const ai = await getAIServiceForOrg(orgId)
    const questionEmbedding = await ai.generateEmbedding(question)
    const vectorStr = JSON.stringify(questionEmbedding)

    // ── STEP 3: Cosine similarity search — top 8 chunks ─────────
    const divisionFilter = scopedToDiv
        ? `AND d.division_id = '${divisionId}'`
        : ''

    const relevantChunks = await prisma.$queryRawUnsafe<
        {
            chunk_id: string
            document_id: string
            doc_title: string
            content: string
            similarity: number
            page_start: number
            page_end: number
            division_name: string
        }[]
    >(
        `SELECT
      dc.id                                              AS chunk_id,
      d.id                                               AS document_id,
      COALESCE(d.ai_title, d.file_name)                  AS doc_title,
      dc.content,
      1 - (dc.embedding <=> $1::vector)                  AS similarity,
      dc.page_number                                     AS page_start,
      COALESCE(dc.page_end, dc.page_number)              AS page_end,
      div.name                                           AS division_name
    FROM document_chunks dc
    JOIN documents  d   ON dc.document_id = d.id
    JOIN divisions  div ON d.division_id  = div.id
    WHERE d.organization_id = $2
      AND d.is_processed   = true
      AND dc.embedding IS NOT NULL
      ${divisionFilter}
    ORDER BY similarity DESC
    LIMIT 8`,
        vectorStr,
        orgId
    )

    // ── STEP 4: Build context string from chunks ────────────────
    const context = relevantChunks
        .map(
            (c, i) =>
                `[Sumber ${i + 1}: ${c.doc_title}, Hal. ${c.page_start}${c.page_end !== c.page_start ? `-${c.page_end}` : ''}]\n${c.content}`
        )
        .join('\n\n---\n\n')

    // ── STEP 5: Build system prompt ─────────────────────────────
    const systemPrompt = `Anda adalah asisten pengetahuan cerdas untuk organisasi ini.
Jawab pertanyaan HANYA berdasarkan dokumen yang diberikan dalam konteks di bawah ini.
Jika informasi tidak ada di konteks, katakan "Informasi ini tidak ditemukan dalam dokumen yang tersedia."
Selalu sebutkan sumber dengan format [Sumber N] ketika menggunakan informasi dari dokumen.
Jawab dalam bahasa yang sama dengan pertanyaan (Indonesia atau Inggris).
Gunakan formatting markdown jika diperlukan untuk kejelasan.

KONTEKS DOKUMEN:
${context || 'Tidak ada dokumen yang relevan ditemukan untuk pertanyaan ini.'}`

    // ── STEP 6: Build prompt from history + new question ────────
    const historyText = history
        .slice(-6) // Last 6 messages (3 turns)
        .map((m) => `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}`)
        .join('\n')

    const fullPrompt = historyText
        ? `${historyText}\n\nUser: ${question}`
        : question

    // ── STEP 7: Stream response ─────────────────────────────────
    await ai.streamCompletion(fullPrompt, systemPrompt, onChunk, signal)

    // ── STEP 8: Return citations ────────────────────────────────
    const citations: Citation[] = relevantChunks.map((c) => ({
        documentId: c.document_id,
        documentTitle: c.doc_title,
        pageStart: c.page_start,
        pageEnd: c.page_end,
        divisionName: c.division_name,
        chunkContent: c.content.slice(0, 150),
    }))

    return citations
}
