'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to our database endpoint
        fetch('/api/admin/error-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'ERROR',
                source: 'Client Global Error Boundary',
                message: error.message || 'Unknown generic client error',
                stack: error.stack,
                url: window.location.href,
            })
        }).catch(err => console.error('Failed to send error to log server:', err))
    }, [error])

    return (
        <html>
            <body>
                <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-danger-bg text-danger rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={40} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold font-display text-navy-900 mb-2">Terjadi Kesalahan Sistem</h2>
                            <p className="text-text-500 text-sm">
                                Sistem mengalami masalah yang tidak terduga. Tim teknis kami telah mencatat error ini.
                            </p>
                        </div>

                        {/* Optional detail in dev mode or for users */}
                        <div className="bg-surface-50 p-4 rounded-lg text-left overflow-hidden">
                            <p className="font-mono text-xs text-danger font-semibold break-words">
                                {error.message}
                            </p>
                        </div>

                        <button
                            onClick={() => reset()}
                            className="btn btn-primary w-full justify-center flex items-center gap-2"
                        >
                            <RefreshCcw size={16} /> Coba Muat Ulang
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
