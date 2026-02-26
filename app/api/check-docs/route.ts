import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const docs = await prisma.document.findMany({
            orderBy: { created_at: 'desc' },
            take: 3,
            include: { _count: { select: { chunks: true } } }
        })

        return NextResponse.json({
            success: true,
            docs: docs.map(d => ({
                id: d.id,
                file_name: d.file_name,
                processing_status: (d as any).processing_status,
                is_processed: d.is_processed,
                chunks_count: d._count.chunks,
                processing_error: d.processing_error,
                raw_log: (d as any).processing_log
            }))
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
