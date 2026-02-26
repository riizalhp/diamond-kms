// app/api/chat/sessions/[id]/summary/route.ts
// POST: Generate AI summary for a chat session
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { getAIServiceForOrg } from '@/lib/ai/get-ai-service'
import { env } from '@/lib/env'

async function getAuthUser() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const session = await prisma.chatSession.findFirst({
        where: { id, user_id: user.id },
        include: {
            messages: { orderBy: { created_at: 'asc' } },
        },
    })

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.messages.length === 0) {
        return NextResponse.json({ error: 'No messages to summarize' }, { status: 400 })
    }

    const ai = await getAIServiceForOrg(session.organization_id)

    const transcript = session.messages
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')

    const summary = await ai.generateCompletion(
        `Ringkas percakapan ini dalam 2-3 kalimat ringkas dalam bahasa Indonesia:\n\n${transcript.slice(0, 8000)}`,
        { maxTokens: 300 }
    )

    await prisma.chatSession.update({
        where: { id },
        data: { summary: summary.trim() },
    })

    return NextResponse.json({ summary: summary.trim() })
}
