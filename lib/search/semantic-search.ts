// lib/search/semantic-search.ts
// Cosine similarity search via pgvector with scope enforcement per role
import prisma from '@/lib/prisma'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import type { Role } from '@prisma/client'

export interface SemanticSearchResult {
    chunkId: string
    documentId: string
    documentTitle: string
    chunkContent: string
    similarity: number
    pageStart: number
    pageEnd: number
    divisionId: string
    divisionName: string
}

export async function semanticSearch(params: {
    query: string
    orgId: string
    userId: string
    userRole: Role
    divisionId: string
    crossDivisionEnabled: boolean
    limit?: number
}): Promise<SemanticSearchResult[]> {
    const {
        query,
        orgId,
        userRole,
        divisionId,
        crossDivisionEnabled,
        limit = 8,
    } = params

    // 1. Embed query using the org's AI provider
    const ai = await getAIServiceForOrg(orgId)
    const queryEmbedding = await ai.generateEmbedding(query)
    const vectorStr = JSON.stringify(queryEmbedding)

    // 2. Determine scope based on role (RAG scope rules)
    const scopedToDiv =
        userRole === 'STAFF' ||
        (userRole === 'SUPERVISOR' && !crossDivisionEnabled)

    // 3. Cosine similarity search with pgvector
    // 1 - cosine_distance = similarity (1 = identical, 0 = unrelated)
    const divisionFilter = scopedToDiv
        ? `AND d.division_id = '${divisionId}'`
        : ''

    const results = await prisma.$queryRawUnsafe<SemanticSearchResult[]>(
        `SELECT
      dc.id              AS "chunkId",
      dc.document_id     AS "documentId",
      COALESCE(d.ai_title, d.file_name) AS "documentTitle",
      dc.content         AS "chunkContent",
      1 - (dc.embedding <=> $1::vector) AS "similarity",
      dc.page_number     AS "pageStart",
      COALESCE(dc.page_end, dc.page_number) AS "pageEnd",
      d.division_id      AS "divisionId",
      div.name           AS "divisionName"
    FROM document_chunks dc
    JOIN documents d   ON dc.document_id = d.id
    JOIN divisions div ON d.division_id  = div.id
    WHERE d.organization_id = $2
      AND d.is_processed   = true
      AND dc.embedding     IS NOT NULL
      ${divisionFilter}
      AND 1 - (dc.embedding <=> $1::vector) > 0.5
    ORDER BY "similarity" DESC
    LIMIT $3`,
        vectorStr,
        orgId,
        limit
    )

    return results
}
