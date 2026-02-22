import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const document = await prisma.document.findUnique({
        where: { id: params.id },
        include: { division: true }
    })

    if (!document) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: document })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const body = await request.json()
    const { protection_config } = body

    const document = await prisma.document.update({
        where: { id: params.id },
        data: { protection_config }
    })

    return NextResponse.json({ success: true, data: document })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const document = await prisma.document.findUnique({ where: { id: params.id } })
    if (!document) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const supabase = createClient()

    // Physically delete from bucket first
    await supabase.storage.from('documents').remove([document.file_path])

    await prisma.document.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
}
