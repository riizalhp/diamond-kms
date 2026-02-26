// app/api/chat/sessions/[id]/route.ts
// GET: Get session with messages
// DELETE: Delete session
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const session = await prisma.chatSession.findFirst({
        where: { id, user_id: user.id },
        include: {
            messages: {
                orderBy: { created_at: 'asc' },
            },
        },
    })

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    return NextResponse.json({ session })
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Ensure ownership
    const session = await prisma.chatSession.findFirst({
        where: { id, user_id: user.id },
    })
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.chatSession.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
