// lib/ai/get-ai-service.ts
// Factory — the only place that knows how to instantiate each provider
import { env } from '@/lib/env'
import { decrypt } from '@/lib/security/key-encryptor'
import { GeminiService } from './providers/gemini'
import { OpenAICompatService } from './providers/openai-compat'
import type { AIProviderConfig, AIService } from './types'

// Default Olla load balancer endpoint (self-hosted)
const OLLA_DEFAULT = 'https://llm01.weldn.ai/olla/openai/v1'

export function getAIService(config: AIProviderConfig): AIService {
    switch (config.provider) {
        case 'managed': {
            const key = env.GEMINI_API_KEY
            if (!key) throw new Error('GEMINI_API_KEY not configured')
            return new GeminiService(key, config.chatModel ?? 'gemini-2.5-flash')
        }

        case 'byok_openrouter': {
            if (!config.encryptedKey) throw new Error('OpenRouter API key not configured')
            return new OpenAICompatService({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: decrypt(config.encryptedKey),
                chatModel: config.chatModel ?? 'google/gemini-2.5-flash',
                embedModel: config.embedModel ?? 'text-embedding-004',
                providerName: 'openrouter',
            })
        }

        case 'byok_openai': {
            if (!config.encryptedKey) throw new Error('OpenAI API key not configured')
            return new OpenAICompatService({
                baseURL: 'https://api.openai.com/v1',
                apiKey: decrypt(config.encryptedKey),
                chatModel: config.chatModel ?? 'gpt-4o-mini',
                embedModel: config.embedModel ?? 'text-embedding-3-small',
                providerName: 'openai',
            })
        }

        case 'self_hosted': {
            if (!config.encryptedKey) throw new Error('Self-hosted API key not configured')
            return new OpenAICompatService({
                baseURL: config.endpoint ?? OLLA_DEFAULT,
                apiKey: decrypt(config.encryptedKey),
                chatModel: config.chatModel ?? 'llama3.3:70b',
                embedModel: config.embedModel ?? 'nomic-embed-text',
                providerName: 'ollama-olla',
            })
        }

        default: {
            // Fallback safe — use Gemini managed
            const key = env.GEMINI_API_KEY
            if (!key) throw new Error('GEMINI_API_KEY not configured for fallback')
            return new GeminiService(key)
        }
    }
}

/**
 * Helper: get AI service from org config in DB
 * Use this in server actions and API routes
 */
export async function getAIServiceForOrg(orgId: string): Promise<AIService> {
    const prisma = (await import('@/lib/prisma')).default
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { ai_provider_config: true },
    })
    const config = (org?.ai_provider_config as AIProviderConfig | null) ?? {
        provider: 'managed' as const,
    }
    return getAIService(config)
}
