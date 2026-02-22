import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const document = await prisma.document.findUnique({
        where: { id: params.id },
        include: { organization: true, division: true }
    })
    if (!document) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const config: any = document.protection_config || {}

    // If download is disabled, block this API completely
    if (config.no_download) {
        return NextResponse.json({ success: false, error: 'Document download is disabled due to Vault config' }, { status: 403 })
    }

    const supabase = createClient()

    // Create signed URL valid for 60 seconds
    const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 60, {
            download: document.file_name // sets content-disposition
        })

    if (error || !data) {
        return NextResponse.json({ success: false, error: error?.message || 'Failed to generate download URL' }, { status: 500 })
    }

    // TODO: Log access via AIUsageLog or similar metric table 
    // e.g. await prisma.aIUsageLog.create({ ... })

    return NextResponse.redirect(data.signedUrl)
}
