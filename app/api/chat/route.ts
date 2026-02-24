// app/api/chat/route.ts
// Server-Sent Events streaming endpoint for RAG chatbot
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { ragQuery, type ChatMessage } from '@/lib/ai/rag-pipeline'
import { hasPermission } from '@/lib/auth/permissions'
import { aiRateLimiter, checkRateLimit } from '@/lib/security/rate-limiter'
import { logger } from '@/lib/logging/redact'
import { env } from '@/lib/env'

export const maxDuration = 60 // Allow up to 60s for streaming response

export async function POST(req: NextRequest) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
            },
        }
    )

    // Auth check
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile + org config
    const userDiv = await prisma.userDivision.findFirst({
        where: { user_id: user.id, is_primary: true },
        include: {
            user: {
                include: {
                    organization: {
                        select: { cross_division_query_enabled: true },
                    },
                },
            },
        },
    })
    if (!userDiv) {
        return Response.json({ error: 'User profile not found' }, { status: 401 })
    }

    // Permission check
    if (!hasPermission(userDiv.role, 'ai:use_chat')) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limit per org
    const orgId = userDiv.user.organization_id
    const rl = await checkRateLimit(aiRateLimiter, `ai:${orgId}`)
    if (!rl.allowed) {
        return Response.json(
            { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
            { status: 429 }
        )
    }

    let question: string
    let history: ChatMessage[]
    try {
        const body = await req.json()
        question = body.question
        history = body.history ?? []
    } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!question?.trim()) {
        return Response.json({ error: 'Question is required' }, { status: 400 })
    }

    const abortController = new AbortController()
    const signal = abortController.signal

    // ── ReadableStream for SSE ──────────────────────────────────
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            const send = (event: string, data: unknown) => {
                controller.enqueue(
                    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
                )
            }

            try {
                // Call RAG pipeline, stream chunk by chunk
                const citations = await ragQuery({
                    question,
                    history,
                    userId: user.id,
                    orgId,
                    userRole: userDiv.role,
                    divisionId: userDiv.division_id,
                    crossDivisionEnabled:
                        userDiv.user.organization?.cross_division_query_enabled ?? false,
                    onChunk: (text) => send('chunk', { text }),
                    signal,
                })

                // Send citations as final event
                send('citations', { citations })
                send('done', { done: true })

                // Log AI usage
                try {
                    await prisma.aIUsageLog.create({
                        data: {
                            organization_id: orgId,
                            user_id: user.id,
                            action_type: 'CHAT_QUERY',
                            tokens_used: Math.ceil(question.length / 3.5) * 3,
                            model_used: 'gemini-2.5-flash',
                        },
                    })
                } catch (logErr) {
                    logger.warn('Failed to log AI usage', logErr)
                }
            } catch (err) {
                if (!signal.aborted) {
                    logger.error('RAG pipeline error', err)
                    send('error', {
                        message: 'Gagal mendapat respons dari AI. Coba lagi.',
                    })
                }
            } finally {
                controller.close()
            }
        },
        cancel() {
            abortController.abort() // Client disconnect → stop LLM
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    })
}
