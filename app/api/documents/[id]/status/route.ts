// app/api/documents/[id]/status/route.ts
// Polling endpoint for document processing status
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { env } from '@/lib/env'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    try {
        // Use findFirst without select to get ALL fields including new ones
        const doc = await prisma.document.findFirst({
            where: { id },
        })

        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        return NextResponse.json({
            document: {
                id: doc.id,
                file_name: doc.file_name,
                processing_status: (doc as any).processing_status ?? 'idle',
                processing_log: (doc as any).processing_log ?? null,
                is_processed: doc.is_processed,
                processing_error: doc.processing_error,
                ai_title: doc.ai_title,
                ai_summary: doc.ai_summary,
                ai_tags: doc.ai_tags,
                created_at: doc.created_at,
            }
        })
    } catch (error: any) {
        console.error('[DOC STATUS API] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
