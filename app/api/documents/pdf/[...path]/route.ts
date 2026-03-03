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
        // Create Supabase admin client to bypass RLS
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Download the file directly from Supabase Storage
        const { data, error } = await supabase.storage
            .from('documents')
            .download(filePath)

        if (error || !data) {
            console.error('[PDF Proxy] Download error:', error?.message)
            return new NextResponse(
                `<html><body style="margin:40px;font-family:sans-serif;color:#666">
                    <h3>⚠️ Gagal memuat PDF</h3>
                    <p>${error?.message || 'File tidak ditemukan di storage'}</p>
                </body></html>`,
                {
                    status: 404,
                    headers: { 'Content-Type': 'text/html' },
                }
            )
        }

        // Convert Blob to ArrayBuffer and serve as PDF
        const arrayBuffer = await data.arrayBuffer()

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline',
                'Cache-Control': 'private, max-age=3600',
                'Content-Length': arrayBuffer.byteLength.toString(),
            },
        })
    } catch (err: any) {
        console.error('[PDF Proxy] Error:', err)
        return new NextResponse(
            `<html><body style="margin:40px;font-family:sans-serif;color:#666">
                <h3>⚠️ Error</h3>
                <p>${err.message || 'Gagal memuat PDF'}</p>
            </body></html>`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/html' },
            }
        )
    }
}
