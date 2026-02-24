// lib/ai/providers/openai-compat.ts
// OpenAI-compatible provider — works with OpenRouter AND Ollama via Olla
import OpenAI from 'openai'
import type { AIService, DocumentMetadata } from '../types'
import { logger } from '@/lib/logging/redact'

export interface OpenAICompatConfig {
    baseURL: string      // 'https://openrouter.ai/api/v1' or Olla endpoint
    apiKey: string
    chatModel: string    // 'google/gemini-2.5-flash', 'llama3.3:70b', etc.
    embedModel: string   // 'nomic-embed-text', or fallback to Gemini
    providerName: string
}

export class OpenAICompatService implements AIService {
    readonly providerName: string
    readonly embeddingModel: string
    private client: OpenAI
    private chatModel: string

    constructor(config: OpenAICompatConfig) {
        this.providerName = config.providerName
        this.embeddingModel = config.embedModel
        this.chatModel = config.chatModel
        this.client = new OpenAI({
            baseURL: config.baseURL,
            apiKey: config.apiKey,
            defaultHeaders: {
                // OpenRouter requires these headers
                'HTTP-Referer': 'https://diamond-kms.app',
                'X-Title': 'DIAMOND KMS',
            },
        })
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.client.embeddings.create({
            model: this.embeddingModel,
            input: text,
        })
        const embedding = response.data[0]?.embedding
        if (!embedding) throw new Error('No embedding returned from provider')
        return embedding
    }

    async generateCompletion(
        prompt: string,
        options?: { systemPrompt?: string; maxTokens?: number; jsonMode?: boolean }
    ): Promise<string> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt })
        }
        messages.push({ role: 'user', content: prompt })

        const response = await this.client.chat.completions.create({
            model: this.chatModel,
            max_tokens: options?.maxTokens ?? 2048,
            response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
            messages,
        })
        return response.choices[0]?.message.content ?? ''
    }

    async streamCompletion(
        prompt: string,
        systemPrompt: string,
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<void> {
        const stream = await this.client.chat.completions.create(
            {
                model: this.chatModel,
                stream: true,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
            },
            { signal }
        )
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta.content ?? ''
            if (text) onChunk(text)
        }
    }

    async generateDocumentMetadata(
        input: { text?: string; fileBuffer?: Buffer; fileName: string }
    ): Promise<DocumentMetadata> {
        const content = input.text ?? `[File: ${input.fileName}]`
        const raw = await this.generateCompletion(
            `Document content:\n${content.slice(0, 8000)}`,
            {
                systemPrompt:
                    'You analyze documents. Return ONLY valid JSON with fields: title (string, max 80 chars), summary (string, 2-3 paragraphs), tags (string array, 5 items), language ("id"|"en"|"mixed"), docType ("sop"|"policy"|"guide"|"report"|"regulation"|"other")',
                jsonMode: true,
            }
        )

        try {
            return JSON.parse(raw) as DocumentMetadata
        } catch (parseError) {
            logger.error('Failed to parse metadata response:', raw)
            return {
                title: input.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                summary: content.slice(0, 200),
                tags: ['document'],
                language: 'id',
                docType: 'other',
            }
        }
    }
}
