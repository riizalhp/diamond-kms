import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params
    const filePath = path.join('/')

    if (!filePath) {
        return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
    }

    const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error || !data?.signedUrl) {
        return NextResponse.json({ error: error?.message || 'Failed to create URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
}
