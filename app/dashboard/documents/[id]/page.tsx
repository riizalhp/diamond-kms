'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getDocumentByIdAction } from '@/lib/actions/document.actions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ArrowLeft, FileText, Bot, Tag, Clock, User, FolderOpen, Hash, Search } from 'lucide-react'
import Link from 'next/link'

export default function DocumentDetailPage() {
    const params = useParams()
    const { role } = useCurrentUser()
    const [doc, setDoc] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [chunkSearch, setChunkSearch] = useState('')
    const [expandedChunk, setExpandedChunk] = useState<number | null>(null)

    useEffect(() => {
        if (params.id) {
            getDocumentByIdAction(params.id as string).then(res => {
                if (res.success) setDoc(res.data)
                setLoading(false)
            })
        }
    }, [params.id])

    if (loading) return <div className="p-8 text-center animate-pulse">Loading document...</div>
    if (!doc) return <div className="p-8 text-center text-danger">Document not found</div>

    const filteredChunks = doc.chunks?.filter((c: any) =>
        c.content.toLowerCase().includes(chunkSearch.toLowerCase())
    ) || []

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/documents" className="p-2 text-text-500 hover:text-navy-900 hover:bg-surface-100 rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold font-display text-navy-900">
                        {doc.ai_title || doc.file_name}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-500">
                        <span className="flex items-center gap-1"><FileText size={14} /> {doc.file_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><FolderOpen size={14} /> {doc.division?.name || 'General'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><User size={14} /> {doc.uploader_name}</span>
                    </div>
                </div>
            </div>

            {/* AI Summary Card */}
            {doc.is_processed && (
                <div className="card p-6 space-y-4">
                    <div className="flex items-center gap-2 text-navy-600">
                        <Bot size={20} />
                        <h2 className="font-bold font-display text-navy-900">AI Analysis</h2>
                    </div>

                    {doc.ai_summary && (
                        <div className="bg-surface-50 border border-surface-200 rounded-lg p-4">
                            <span className="text-xs font-semibold uppercase text-text-300 tracking-wider">Summary</span>
                            <p className="text-text-700 mt-1 leading-relaxed">{doc.ai_summary}</p>
                        </div>
                    )}

                    {doc.ai_tags?.length > 0 && (
                        <div>
                            <span className="text-xs font-semibold uppercase text-text-300 tracking-wider flex items-center gap-1"><Tag size={12} /> Tags</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {doc.ai_tags.map((tag: string, i: number) => (
                                    <span key={i} className="badge bg-navy-100 text-navy-700">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Document Chunks */}
            <div className="card overflow-hidden">
                <div className="p-5 border-b border-surface-200 bg-surface-0 flex justify-between items-center">
                    <h2 className="font-bold font-display text-navy-900 flex items-center gap-2">
                        <Hash size={18} className="text-navy-600" />
                        Document Chunks ({doc.chunks?.length || 0})
                    </h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-300" size={14} />
                        <input
                            type="text"
                            placeholder="Search within chunks..."
                            value={chunkSearch}
                            onChange={(e) => setChunkSearch(e.target.value)}
                            className="input-field pl-9 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="p-5 bg-surface-50 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {filteredChunks.length === 0 ? (
                        <div className="text-center py-12 text-text-500">
                            {chunkSearch ? 'No chunks match your search.' : 'No chunks available.'}
                        </div>
                    ) : (
                        filteredChunks.map((chunk: any, i: number) => (
                            <div
                                key={chunk.id}
                                className="bg-white border border-surface-200 rounded-lg p-4 hover:border-navy-400 transition cursor-pointer"
                                onClick={() => setExpandedChunk(expandedChunk === i ? null : i)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="badge bg-surface-100 text-text-700">Chunk #{chunk.chunk_index + 1}</span>
                                        {chunk.page_number && (
                                            <span className="text-xs text-text-300">Page {chunk.page_number}</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-text-300">{chunk.token_count} tokens</span>
                                </div>
                                <p className={`text-sm text-text-700 leading-relaxed whitespace-pre-wrap ${expandedChunk === i ? '' : 'line-clamp-3'}`}>
                                    {chunk.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
