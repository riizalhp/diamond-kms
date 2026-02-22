import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) return NextResponse.json({ success: false, error: 'Missing orgId' }, { status: 400 })

    const users = await prisma.user.findMany({
        where: { organization_id: orgId },
        include: {
            user_divisions: {
                include: { division: true }
            }
        }
    })

    return NextResponse.json({ success: true, data: users })
}
