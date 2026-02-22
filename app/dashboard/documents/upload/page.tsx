'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDivisionsAction } from '@/lib/actions/user.actions'
import { createDocumentAction, processDocumentAction } from '@/lib/actions/document.actions'
import { ArrowLeft, Upload, FileText, CheckCircle, Loader2, Bot, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function UploadDocumentPage() {
    const router = useRouter()
    const { organization, user } = useCurrentUser()
    const [divisions, setDivisions] = useState<any[]>([])
    const [divisionId, setDivisionId] = useState('')

    // Upload states
    const [file, setFile] = useState<File | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [step, setStep] = useState<'select' | 'uploading' | 'processing' | 'done'>('select')
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (organization?.id) {
            getDivisionsAction(organization.id).then(res => {
                if (res.success && res.data) {
                    setDivisions(res.data)
                    if (res.data.length > 0) setDivisionId(res.data[0].id)
                }
            })
        }
    }, [organization?.id])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) setFile(droppedFile)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) setFile(selectedFile)
    }

    const simulateAIProcessing = (fileName: string, fileContent: string) => {
        // Simulate AI processing for demo - in production this would call Gemini/OpenAI
        const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        const words = fileContent.split(/\s+/)
        const summary = words.length > 50
            ? words.slice(0, 50).join(' ') + '...'
            : fileContent || `AI-generated summary for ${fileName}`

        const tags = ['document', 'knowledge-base']
        if (fileName.toLowerCase().includes('sop')) tags.push('sop')
        if (fileName.toLowerCase().includes('policy')) tags.push('policy')
        if (fileName.toLowerCase().includes('manual')) tags.push('manual')
        tags.push(fileName.split('.').pop() || 'file')

        // Create chunks (split by paragraphs or every ~500 chars)
        const chunkSize = 500
        const chunks: { content: string; tokenCount: number; pageNumber: number }[] = []
        for (let i = 0; i < fileContent.length; i += chunkSize) {
            chunks.push({
                content: fileContent.slice(i, i + chunkSize),
                tokenCount: Math.ceil(fileContent.slice(i, i + chunkSize).split(/\s+/).length * 1.3),
                pageNumber: Math.floor(i / chunkSize) + 1
            })
        }

        if (chunks.length === 0) {
            chunks.push({
                content: `Content of ${fileName} - this document is pending full text extraction.`,
                tokenCount: 10,
                pageNumber: 1
            })
        }

        return { title, summary, tags, chunks }
    }

    const handleUpload = async () => {
        if (!file || !user?.id || !organization?.id || !divisionId) return
        setError('')
        setStep('uploading')
        setUploading(true)

        try {
            // Step 1: Create document record
            const filePath = `/uploads/${organization.id}/${Date.now()}_${file.name}`
            const docRes = await createDocumentAction({
                fileName: file.name,
                filePath,
                fileSize: file.size,
                mimeType: file.type,
                divisionId,
                orgId: organization.id,
                userId: user.id
            })

            if (!docRes.success) {
                setError(docRes.error || 'Failed to create document record')
                setStep('select')
                setUploading(false)
                return
            }

            setUploading(false)
            setStep('processing')
            setProcessing(true)

            // Step 2: Read file content (for text-based files)
            let fileContent = ''
            try {
                fileContent = await file.text()
            } catch {
                fileContent = `Binary file: ${file.name} (${file.type})`
            }

            // Step 3: Simulate AI processing
            await new Promise(r => setTimeout(r, 2000)) // Simulate AI latency
            const aiData = simulateAIProcessing(file.name, fileContent)

            // Step 4: Save AI results
            const processRes = await processDocumentAction(docRes.data!.id, aiData)

            if (!processRes.success) {
                setError(processRes.error || 'AI processing failed')
                setStep('select')
                setProcessing(false)
                return
            }

            setResult({ docId: docRes.data!.id, ...aiData })
            setStep('done')
            setProcessing(false)
        } catch (err: any) {
            setError(err.message || 'Upload failed')
            setStep('select')
            setUploading(false)
            setProcessing(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/documents" className="p-2 text-text-500 hover:text-navy-900 hover:bg-surface-100 rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold font-display text-navy-900">Upload Document</h1>
            </div>

            <div className="card p-8">
                {error && (
                    <div className="p-4 rounded-md mb-6 text-sm font-medium bg-danger-bg text-danger border border-red-200">
                        {error}
                    </div>
                )}

                {step === 'select' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-700">Target Division <span className="text-danger">*</span></label>
                            <select
                                value={divisionId}
                                onChange={(e) => setDivisionId(e.target.value)}
                                className="w-full border-surface-200 border rounded-md p-2.5 focus:ring-navy-600 focus:border-navy-600 bg-white"
                            >
                                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${dragOver ? 'border-navy-600 bg-navy-50' :
                                    file ? 'border-success bg-success-bg' :
                                        'border-surface-300 hover:border-navy-400 hover:bg-surface-50'
                                }`}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx"
                                onChange={handleFileChange}
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 bg-success-bg text-success rounded-full flex items-center justify-center">
                                        <CheckCircle size={28} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-navy-900">{file.name}</p>
                                        <p className="text-sm text-text-500 mt-1">{(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}</p>
                                    </div>
                                    <p className="text-xs text-text-300 mt-2">Click to change file</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 bg-surface-100 text-text-300 rounded-full flex items-center justify-center">
                                        <Upload size={28} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-navy-900">Drop a file here or click to browse</p>
                                        <p className="text-sm text-text-500 mt-1">PDF, Word, Excel, PowerPoint, TXT, Markdown, CSV</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleUpload}
                                disabled={!file || !divisionId}
                                className="btn btn-primary shadow-md disabled:opacity-50"
                            >
                                <Upload size={16} /> Upload & Process with AI
                            </button>
                        </div>
                    </div>
                )}

                {(step === 'uploading' || step === 'processing') && (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                {step === 'uploading' ? <Upload size={24} className="text-navy-600" /> : <Bot size={24} className="text-navy-600" />}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-display text-navy-900">
                                {step === 'uploading' ? 'Uploading Document...' : 'AI Processing...'}
                            </h3>
                            <p className="text-text-500 mt-2 max-w-md">
                                {step === 'uploading'
                                    ? 'Your file is being uploaded to the secure repository.'
                                    : 'Our AI is reading your document, generating a smart title, summary, tags, and splitting it into searchable chunks.'}
                            </p>
                        </div>
                    </div>
                )}

                {step === 'done' && result && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center text-center py-6">
                            <div className="w-16 h-16 bg-success-bg text-success rounded-full flex items-center justify-center mb-4">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-2xl font-bold font-display text-navy-900">Document Processed!</h3>
                            <p className="text-text-500 mt-2">AI has analyzed your document and extracted the following information.</p>
                        </div>

                        <div className="bg-surface-50 border border-surface-200 rounded-lg p-6 space-y-4">
                            <div>
                                <span className="text-xs font-semibold uppercase text-text-300 tracking-wider">AI-Generated Title</span>
                                <p className="font-bold text-navy-900 text-lg mt-1">{result.title}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase text-text-300 tracking-wider">AI Summary</span>
                                <p className="text-text-700 mt-1 leading-relaxed">{result.summary}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase text-text-300 tracking-wider">Tags</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {result.tags.map((tag: string, i: number) => (
                                        <span key={i} className="badge bg-navy-100 text-navy-700">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase text-text-300 tracking-wider">Chunks Created</span>
                                <p className="text-text-700 mt-1">{result.chunks.length} searchable chunk(s)</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button onClick={() => { setFile(null); setStep('select'); setResult(null) }} className="btn btn-secondary">
                                Upload Another
                            </button>
                            <Link href={`/dashboard/documents/${result.docId}`} className="btn btn-primary">
                                View Document
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
