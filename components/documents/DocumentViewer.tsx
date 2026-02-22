import { useState, useEffect } from 'react'

// dynamic import pdfjs-dist without SSR in consumer component
export function DocumentViewer({
    url,
    protection
}: {
    url: string,
    protection: any
}) {
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (protection.drm) {
            // Basic DRM - disable right click
            const handleContextMenu = (e: any) => e.preventDefault()
            // Disable copy
            const handleCopy = (e: any) => e.preventDefault()
            // Prevent Print & Save (Ctrl+P, Ctrl+S)
            const handleKeyDown = (e: any) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
                    e.preventDefault()
                }
            }

            document.addEventListener('contextmenu', handleContextMenu)
            document.addEventListener('copy', handleCopy)
            document.addEventListener('keydown', handleKeyDown)

            return () => {
                document.removeEventListener('contextmenu', handleContextMenu)
                document.removeEventListener('copy', handleCopy)
                document.removeEventListener('keydown', handleKeyDown)
            }
        }
    }, [protection])

    return (
        <div
            className={`relative w-full h-[600px] bg-slate-100 rounded border overflow-hidden ${protection.drm ? 'select-none' : ''}`}
        >
            {/* Watermark Overlay */}
            {protection.watermark && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-10 z-50">
                    <div className="text-4xl font-bold transform -rotate-45 space-y-4 text-center text-slate-900">
                        <p>CONFIDENTIAL</p>
                        <p className="text-2xl">{new Date().toLocaleString()}</p>
                    </div>
                </div>
            )}

            <iframe
                src={url}
                className="w-full h-full border-none"
                onLoad={() => setLoading(false)}
                title="Document Viewer"
            />

            {loading && (
                <div className="absolute inset-0 bg-white flex items-center justify-center">
                    <p className="text-slate-500 animate-pulse">Loading Document...</p>
                </div>
            )}
        </div>
    )
}
