'use client'

import { useState } from 'react'

export function ProtectionConfigPanel({ document, onUpdate }: { document: any, onUpdate: (cfg: any) => void }) {
    const [drm, setDrm] = useState(document.protection_config?.drm || false)
    const [watermark, setWatermark] = useState(document.protection_config?.watermark || false)
    const [noDownload, setNoDownload] = useState(document.protection_config?.no_download || false)

    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        const newConfig = { drm, watermark, no_download: noDownload }

        // Call API to update document
        await fetch(`/api/documents/${document.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ protection_config: newConfig })
        })

        onUpdate(newConfig)
        setSaving(false)
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border mt-4">
            <h3 className="font-semibold mb-4 text-slate-800">Security Vault config</h3>

            <div className="space-y-3 relative">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={drm}
                        onChange={e => setDrm(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">DRM Protection</span>
                </label>
                <p className="text-xs text-slate-500 pl-8 -mt-2">Disables right-click, text selection, and print shortcuts.</p>

                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={watermark}
                        onChange={e => setWatermark(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Dynamic Watermark</span>
                </label>
                <p className="text-xs text-slate-500 pl-8 -mt-2">Overlays viewer info and timestamp on every page.</p>

                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={noDownload}
                        onChange={e => setNoDownload(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Prevent Download</span>
                </label>
                <p className="text-xs text-slate-500 pl-8 -mt-2">Removes the download button completely.</p>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full mt-4 bg-slate-800 text-white py-2 rounded text-sm hover:bg-slate-900 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Apply Security Rules'}
                </button>
            </div>
        </div>
    )
}
