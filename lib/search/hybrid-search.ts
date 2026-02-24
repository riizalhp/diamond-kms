// lib/search/hybrid-search.ts
// Combines full-text + semantic search, with fallback if AI is down
import prisma from '@/lib/prisma'
import {
    semanticSearch,
    type SemanticSearchResult,
} from './semantic-search'
import type { Role } from '@prisma/client'

export interface HybridSearchResult {
    id: string
    type: 'document' | 'content' | 'faq'
    title: string
    excerpt: string
    score: number // 0-1, combined rank
    source: 'semantic' | 'fulltext' | 'both'
    pageStart?: number
    pageEnd?: number
    divisionName?: string
}

export async function hybridSearch(params: {
    query: string
    orgId: string
    userId: string
    userRole: Role
    divisionId: string
    crossDivisionEnabled: boolean
}): Promise<HybridSearchResult[]> {
    const { query, orgId, userRole, divisionId, crossDivisionEnabled } = params

    // Run full-text and semantic search in parallel
    const [ftResults, semResults] = await Promise.allSettled([
        fullTextSearch({
            query,
            orgId,
            userRole,
            divisionId,
            crossDivisionEnabled,
        }),
        semanticSearch({
            query,
            orgId,
            userId: params.userId,
            userRole,
            divisionId,
            crossDivisionEnabled,
        }),
    ])

    const ftList = ftResults.status === 'fulfilled' ? ftResults.value : []
    const semList = semResults.status === 'fulfilled' ? semResults.value : []

    // Merge and deduplicate
    const merged = mergeResults(ftList, semList)
    return merged.sort((a, b) => b.score - a.score).slice(0, 20)
}

// ─── Full-text search (SQL ILIKE fallback) ──────────────────────
async function fullTextSearch(params: {
    query: string
    orgId: string
    userRole: Role
    divisionId: string
    crossDivisionEnabled: boolean
}): Promise<HybridSearchResult[]> {
    const { query, orgId, userRole, divisionId, crossDivisionEnabled } = params
    const scopedToDiv =
        userRole === 'STAFF' ||
        (userRole === 'SUPERVISOR' && !crossDivisionEnabled)

    const whereClause: Record<string, unknown> = {
        organization_id: orgId,
        is_processed: true,
        OR: [
            { ai_title: { contains: query, mode: 'insensitive' } },
            { ai_summary: { contains: query, mode: 'insensitive' } },
            { file_name: { contains: query, mode: 'insensitive' } },
        ],
    }
    if (scopedToDiv) {
        whereClause.division_id = divisionId
    }

    const rows = await prisma.document.findMany({
        where: whereClause as Parameters<typeof prisma.document.findMany>[0] extends { where?: infer W } ? W : never,
        include: {
            division: { select: { name: true } },
        },
        take: 10,
        orderBy: { created_at: 'desc' },
    })

    return rows.map((r) => ({
        id: r.id,
        type: 'document' as const,
        title: r.ai_title || r.file_name,
        excerpt: r.ai_summary?.slice(0, 200) || '',
        score: 0.5, // Base score for full-text match
        source: 'fulltext' as const,
        divisionName: r.division.name,
    }))
}

// ─── Merge results ─────────────────────────────────────────────
function mergeResults(
    ftResults: HybridSearchResult[],
    semResults: SemanticSearchResult[]
): HybridSearchResult[] {
    const map = new Map<string, HybridSearchResult>()

    ftResults.forEach((r) => map.set(r.id, r))

    semResults.forEach((sem) => {
        const existing = map.get(sem.documentId)
        if (existing) {
            // Found in both — boost score
            existing.score = Math.min(Math.max(existing.score, sem.similarity) * 1.2, 1)
            existing.source = 'both'
            existing.pageStart = sem.pageStart
            existing.pageEnd = sem.pageEnd
            existing.excerpt = sem.chunkContent.slice(0, 200)
        } else {
            map.set(sem.documentId, {
                id: sem.documentId,
                type: 'document',
                title: sem.documentTitle,
                excerpt: sem.chunkContent.slice(0, 200),
                score: sem.similarity,
                source: 'semantic',
                pageStart: sem.pageStart,
                pageEnd: sem.pageEnd,
                divisionName: sem.divisionName,
            })
        }
    })

    return Array.from(map.values())
}
