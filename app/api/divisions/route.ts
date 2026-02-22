import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) return NextResponse.json({ success: false, error: 'Missing orgId' }, { status: 400 })

    const divisions = await prisma.division.findMany({
        where: { organization_id: orgId },
        include: {
            _count: {
                select: { user_divisions: true }
            }
        }
    })

    return NextResponse.json({ success: true, data: divisions })
}

export async function POST(request: Request) {
    const body = await request.json()
    const { name, description, orgId } = body

    const division = await prisma.division.create({
        data: {
            name,
            description,
            organization_id: orgId
        }
    })

    return NextResponse.json({ success: true, data: division })
}
