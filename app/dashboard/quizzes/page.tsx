'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getQuizzesAction, deleteQuizAction } from '@/lib/actions/quiz.actions'
import { Plus, Search, HelpCircle, Trash2, Clock, CheckCircle, FileQuestion } from 'lucide-react'
import Link from 'next/link'

export default function QuizzesPage() {
    const { organization, role } = useCurrentUser()
    const [quizzes, setQuizzes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const loadData = async () => {
        if (!organization?.id) return
        const res = await getQuizzesAction(organization.id)
        if (res.success) {
            setQuizzes(res.data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [organization?.id])

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return
        const res = await deleteQuizAction(id)
        if (res.success) {
            loadData()
        } else {
            alert(res.error || 'Failed to delete quiz')
        }
    }

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-[28px] font-bold font-display text-navy-900 leading-tight">Learning Quizzes</h1>
                    <p className="text-sm text-text-500 mt-1">Uji pemahaman Anda melalui kuis yang tersedia.</p>
                </div>
                {['SUPER_ADMIN', 'GROUP_ADMIN', 'MAINTAINER'].includes(role || '') && (
                    <Link
                        href="/dashboard/quizzes/create"
                        className="btn btn-primary"
                    >
                        <Plus size={16} /> Create Quiz
                    </Link>
                )}
            </div>

            <div className="card overflow-hidden">
                <div className="p-5 border-b border-surface-200 bg-surface-0 flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-300" size={16} />
                        <input
                            type="text"
                            placeholder="Cari kuis..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                </div>

                <div className="p-6 bg-surface-50 min-h-[50vh]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-text-500 font-medium">Memuat kuis...</p>
                        </div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-surface-200 text-text-300 rounded-full flex items-center justify-center mb-4">
                                <FileQuestion size={32} />
                            </div>
                            <h3 className="font-display text-lg font-bold text-navy-900 mb-2">Belum ada kuis</h3>
                            <p className="text-text-500 max-w-sm">
                                {searchTerm
                                    ? `Tidak ditemukan kuis dengan kata kunci "${searchTerm}"`
                                    : "Kuis yang dipublikasikan akan muncul di sini."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredQuizzes.map((q) => (
                                <div key={q.id} className="card card-hover flex flex-col overflow-hidden">
                                    <div className="p-5 flex-1 bg-surface-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <span
                                                className="badge"
                                                style={{
                                                    background: q.is_published ? 'var(--color-success-bg)' : 'var(--color-info-bg)',
                                                    color: q.is_published ? 'var(--color-success)' : 'var(--color-info)'
                                                }}
                                            >
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.is_published ? 'var(--color-success)' : 'var(--color-info)', display: 'inline-block' }} />
                                                {q.is_published ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold font-display text-navy-900 text-[16px] leading-tight line-clamp-2 mb-2">
                                            {q.title}
                                        </h3>
                                        <p className="text-[13px] text-text-500 line-clamp-2 mb-5">
                                            {q.description || 'Tidak ada deskripsi.'}
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            <span className="chip bg-surface-100 text-text-700">
                                                <HelpCircle size={12} className="text-text-500" /> {q._count?.questions || 0} Soal
                                            </span>
                                            {q.time_limit_minutes && (
                                                <span className="chip bg-surface-100 text-text-700">
                                                    <Clock size={12} className="text-text-500" /> {q.time_limit_minutes} Min
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border-t border-surface-200 bg-surface-50 p-4 flex justify-between items-center gap-3">
                                        <Link
                                            href={`/dashboard/quizzes/${q.id}`}
                                            className="btn btn-primary flex-1 justify-center"
                                        >
                                            Mulai Kuis
                                        </Link>

                                        {['SUPER_ADMIN', 'GROUP_ADMIN'].includes(role || '') && (
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                className="w-10 h-10 flex items-center justify-center text-danger bg-danger-bg hover:opacity-80 rounded-lg transition shrink-0"
                                                title="Hapus Kuis"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
