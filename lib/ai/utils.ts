// lib/ai/utils.ts
import { logger } from '@/lib/logging/redact'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Execute an async operation with exponential backoff retries.
 * Automatically catches 429 Too Many Requests errors and waits before retrying.
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 8,
    initialDelayMs = 3000
): Promise<T> {
    let attempt = 0
    while (true) {
        try {
            return await operation()
        } catch (error: any) {
            attempt++

            const errMsg = error?.message?.toLowerCase() || ''
            const status = error?.status || error?.response?.status

            const isRateLimit =
                status === 429 ||
                errMsg.includes('429') ||
                errMsg.includes('too many requests') ||
                errMsg.includes('quota') ||
                errMsg.includes('rate limit') ||
                errMsg.includes('resource has been exhausted') ||
                errMsg.includes('requests per minute') ||
                errMsg.includes('resource_exhausted')

            if (isRateLimit && attempt <= maxRetries) {
                // Exponential backoff: 3s, 6s, 12s, 24s, 48s, 96s...
                const sleepMs = initialDelayMs * Math.pow(2, attempt - 1)
                console.log(`⏳ [AI RETRY] Rate limit hit. Waiting ${sleepMs / 1000}s... (Attempt ${attempt}/${maxRetries})`)
                logger.warn(`AI API rate limit exceeded. Retrying in ${sleepMs}ms... (Attempt ${attempt}/${maxRetries})`)
                await delay(sleepMs)
                continue
            }

            // If it's not a rate limit error or we ran out of retries, throw
            throw error
        }
    }
}
