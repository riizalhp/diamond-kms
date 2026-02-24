// lib/ai/chunker.ts
// Semantic-aware chunking — split at paragraph boundaries, not mid-sentence
import type { PageText } from './pdf-extractor'

export interface DocumentChunkData {
    chunkIndex: number
    content: string
    pageStart: number
    pageEnd: number
    tokenCount: number
}

/**
 * Estimate token count: ~1 token per 3.5 characters
 * (average for mixed Indonesian/English text)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5)
}

/**
 * Chunk document into semantically meaningful segments
 * @param pages - Array of page texts
 * @param maxTokens - Target max tokens per chunk (default 400)
 * @param overlapTokens - Overlap between chunks for continuity (default 50)
 */
export function chunkDocument(
    pages: PageText[],
    maxTokens = 400,
    overlapTokens = 50
): DocumentChunkData[] {
    const chunks: DocumentChunkData[] = []
    let currentText = ''
    let currentPageStart = 1
    let currentPageEnd = 1
    let chunkIndex = 0

    for (const page of pages) {
        // Split page into paragraphs (double newline or sentence-ending newline)
        const paragraphs = page.text
            .split(/\n{2,}|(?<=\.\s)\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 20) // Skip very short paragraphs

        for (const para of paragraphs) {
            const combined = currentText ? `${currentText}\n\n${para}` : para
            const tokens = estimateTokens(combined)

            if (tokens > maxTokens && currentText.length > 0) {
                // Save current chunk
                chunks.push({
                    chunkIndex: chunkIndex++,
                    content: currentText,
                    pageStart: currentPageStart,
                    pageEnd: currentPageEnd,
                    tokenCount: estimateTokens(currentText),
                })

                // Start new chunk with overlap from previous
                const overlapText = getLastNTokens(currentText, overlapTokens)
                currentText = overlapText ? `${overlapText}\n\n${para}` : para
                currentPageStart = page.pageNum
            } else {
                currentText = combined
                if (!currentText) currentPageStart = page.pageNum
            }
            currentPageEnd = page.pageNum
        }
    }

    // Flush last chunk
    if (currentText.trim().length > 20) {
        chunks.push({
            chunkIndex,
            content: currentText,
            pageStart: currentPageStart,
            pageEnd: currentPageEnd,
            tokenCount: estimateTokens(currentText),
        })
    }

    return chunks
}

function getLastNTokens(text: string, n: number): string {
    const targetChars = Math.round(n * 3.5)
    if (text.length <= targetChars) return text
    return text.slice(-targetChars)
}
