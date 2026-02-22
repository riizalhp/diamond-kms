'use client'

import { useState } from 'react'

export function DocumentUploader() {
    const [files, setFiles] = useState<File[]>([])
    const [status, setStatus] = useState({ type: '', msg: '' })

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
        if (droppedFiles.length + files.length > 5) {
            alert("Max 5 files at once.")
            return
        }
        setFiles(prev => [...prev, ...droppedFiles])
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
            setFiles(prev => [...prev, ...selectedFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        if (files.length === 0) return
        setStatus({ type: 'loading', msg: 'Uploading...' })

        // In a real implementation this would:
        // 1. Get presigned URL or upload directly to Supabase Storage
        // 2. Call /api/documents to record it
        // 3. Document AI processing begins asynchronously

        await new Promise(r => setTimeout(r, 2000)) // placeholder

        setStatus({ type: 'success', msg: 'Files uploaded! AI is processing them.' })
        setFiles([])
        setTimeout(() => setStatus({ type: '', msg: '' }), 3000)
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>

            {status.msg && (
                <div className={`p-3 rounded mb-4 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {status.msg}
                </div>
            )}

            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <p className="text-slate-600 mb-2">Drag and drop PDF files here</p>
                <p className="text-sm text-slate-400">or click to browse</p>
                <input
                    id="file-upload"
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-700">Selected files:</p>
                    {files.map((file, i) => (
                        <div key={i} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                            <span className="truncate max-w-[250px]">{file.name}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                                className="text-red-500 hover:text-red-700 ml-2"
                            >
                                Remove
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleUpload}
                        disabled={status.type === 'loading'}
                        className="w-full mt-4 bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {status.type === 'loading' ? 'Uploading...' : `Upload ${files.length} file(s)`}
                    </button>
                </div>
            )}
        </div>
    )
}
