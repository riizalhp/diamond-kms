import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
        return NextResponse.json({ success: false, error: 'Missing orgId' }, { status: 400 })
    }

    try {
        const documents = await prisma.document.findMany({
            where: {
                organization_id: orgId,
                is_processed: true
            },
            select: {
                id: true,
                file_name: true,
                ai_title: true,
                ai_summary: true,
                division: { select: { id: true, name: true } }
            },
            orderBy: { created_at: 'desc' }
        })

        return NextResponse.json({ success: true, data: documents })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
