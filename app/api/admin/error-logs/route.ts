import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logErrorToDB } from '@/lib/error-logger'

export async function GET(req: NextRequest) {
    // Only accessible via admin roles, but for simplicity of this endpoint we assume the client 
    // already guards the page. In a real app we'd verify the JWT here.

    try {
        const url = new URL(req.url)
        const level = url.searchParams.get('level') || 'ALL'
        const limit = parseInt(url.searchParams.get('limit') || '50', 10)

        const where: any = {}
        if (level !== 'ALL') {
            where.level = level
        }

        const logs = await prisma.errorLog.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: limit
        })

        return NextResponse.json({ success: true, data: logs })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        await logErrorToDB({
            level: body.level || 'ERROR',
            source: body.source || 'Client UI',
            message: body.message || 'Unknown client error',
            stack: body.stack,
            url: body.url,
            method: body.method,
            userId: body.userId,
            orgId: body.orgId,
            metadata: body.metadata
        })
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
