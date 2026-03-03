import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params
    const filePath = path.join('/')

    if (!filePath) {
        return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
    }

    try {
        // Create fresh client per request to avoid stale JWT issues
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(filePath, 3600) // 1 hour expiry

        if (error || !data?.signedUrl) {
            console.error('[Signed URL] Supabase error:', error?.message)

            // Fallback: try public URL if signed URL fails
            const { data: publicUrlData } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath)

            if (publicUrlData?.publicUrl) {
                return NextResponse.json({ url: publicUrlData.publicUrl })
            }

            return NextResponse.json(
                { error: error?.message || 'Failed to create signed URL' },
                { status: 500 }
            )
        }

        return NextResponse.json({ url: data.signedUrl })
    } catch (err: any) {
        console.error('[Signed URL] Error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
