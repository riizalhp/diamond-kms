// app/api/chat/sessions/route.ts
// GET: List sessions for current user
// POST: Create a new session
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

export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sessions = await prisma.chatSession.findMany({
        where: { user_id: user.id },
        orderBy: { updated_at: 'desc' },
        select: {
            id: true,
            title: true,
            summary: true,
            created_at: true,
            updated_at: true,
            _count: { select: { messages: true } },
        },
    })

    return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.userDivision.findFirst({
        where: { user_id: user.id, is_primary: true },
        include: { user: true },
    })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 401 })

    const session = await prisma.chatSession.create({
        data: {
            user_id: user.id,
            organization_id: profile.user.organization_id,
            title: 'New Chat',
        },
    })

    return NextResponse.json({ session })
}
