'use client'

import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getFAQsAction, createFAQAction, deleteFAQAction } from '@/lib/actions/faq.actions'
import { getDivisionsAction } from '@/lib/actions/user.actions'
import { HelpCircle, Plus, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react'

export default function FAQsPage() {
    const { organization, user, role } = useCurrentUser()

    const [faqs, setFaqs] = useState<any[]>([])
    const [divisions, setDivisions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({ question: '', answer: '', divisionId: '' })

    // Accordion state
    const [openIndex, setOpenIndex] = useState<string | null>(null)

    const loadData = async () => {
        if (!organization?.id) return

        const [faqsRes, divsRes] = await Promise.all([
            getFAQsAction(organization.id),
            getDivisionsAction(organization.id)
        ])

        if (faqsRes.success) setFaqs(faqsRes.data || [])
        if (divsRes.success) {
            setDivisions(divsRes.data || [])
            if (divsRes.data && divsRes.data.length > 0) {
                setFormData(prev => ({ ...prev, divisionId: divsRes.data![0].id }))
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [organization?.id])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !organization) return
        setSaving(true)

        const res = await createFAQAction({
            question: formData.question,
            answer: formData.answer,
            divisionId: formData.divisionId,
            orgId: organization.id,
            userId: user.id
        })

        if (res.success) {
            setIsModalOpen(false)
            setFormData(prev => ({ ...prev, question: '', answer: '' }))
            loadData()
        } else {
            alert(res.error || 'Failed to create FAQ')
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this FAQ?')) return
        const res = await deleteFAQAction(id)
        if (res.success) {
            loadData()
        } else {
            alert(res.error || 'Failed to delete')
        }
    }

    // Group FAQs by division
    const filteredFaqs = faqs.filter(f =>
        f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const faqsByDivision = filteredFaqs.reduce((acc: any, faq: any) => {
        const divName = faq.division?.name || 'General'
        if (!acc[divName]) acc[divName] = []
        acc[divName].push(faq)
        return acc
    }, {})

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-navy-600 rounded-xl p-8 text-white shadow-sm mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-display flex items-center gap-3 mb-2">
                        <HelpCircle size={32} /> Help Center & FAQs
                    </h1>
                    <p className="text-blue-100 max-w-lg">Quick answers to common questions. Find what you need without having to read through entire manuals.</p>
                </div>
                {['SUPER_ADMIN', 'GROUP_ADMIN', 'MAINTAINER'].includes(role || '') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white text-navy-600 px-5 py-2.5 rounded-lg font-bold font-display shadow hover:bg-navy-50 transition flex items-center gap-2"
                    >
                        <Plus size={18} /> Add FAQ
                    </button>
                )}
            </div>

            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-300" size={20} />
                <input
                    type="text"
                    placeholder="Search for questions or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-4 w-full border-2 border-surface-200 rounded-xl shadow-sm text-lg focus:ring-navy-600 focus:border-navy-600 outline-none"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-text-500 animate-pulse">Loading FAQs...</div>
            ) : Object.keys(faqsByDivision).length === 0 ? (
                <div className="text-center border-2 border-dashed border-surface-200 rounded-xl py-12 text-text-500">
                    <HelpCircle size={48} className="mx-auto text-text-300 mb-4" />
                    <p>No FAQs available matching your search.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(faqsByDivision).sort().map((divName) => (
                        <div key={divName} className="space-y-4">
                            <h2 className="text-xl font-bold font-display text-navy-900 border-b pb-2">{divName}</h2>
                            <div className="space-y-3">
                                {faqsByDivision[divName].map((faq: any) => (
                                    <div key={faq.id} className="bg-white border text-left rounded-lg shadow-sm overflow-hidden transition-all duration-200">
                                        <div className="flex">
                                            <button
                                                onClick={() => setOpenIndex(openIndex === faq.id ? null : faq.id)}
                                                className="flex-1 px-6 py-4 flex justify-between items-center hover:bg-surface-50 text-left"
                                            >
                                                <span className="font-semibold text-navy-900 pr-4">{faq.question}</span>
                                                {openIndex === faq.id ? <ChevronUp size={20} className="text-text-300 shrink-0" /> : <ChevronDown size={20} className="text-text-300 shrink-0" />}
                                            </button>

                                            {['SUPER_ADMIN', 'GROUP_ADMIN'].includes(role || '') && (
                                                <div className="border-l flex items-center shrink-0">
                                                    <button
                                                        onClick={() => handleDelete(faq.id)}
                                                        className="px-4 py-4 text-red-400 hover:text-danger hover:bg-danger-bg transition"
                                                        title="Delete FAQ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {openIndex === faq.id && (
                                            <div className="px-6 py-4 border-t bg-surface-50">
                                                <p className="text-text-700 whitespace-pre-wrap">{faq.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create FAQ Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b bg-surface-50">
                            <h2 className="text-xl font-bold font-display flex items-center gap-2 text-navy-900">
                                <Plus size={20} className="text-navy-600" /> Add New FAQ
                            </h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-text-700">Category / Division</label>
                                <select
                                    required
                                    value={formData.divisionId}
                                    onChange={e => setFormData({ ...formData, divisionId: e.target.value })}
                                    className="w-full border rounded-md p-2.5 focus:ring-navy-600 bg-white"
                                >
                                    {divisions.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-text-700">Question</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.question}
                                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                                    className="w-full border rounded-md p-2.5 focus:ring-navy-600 focus:border-navy-600"
                                    placeholder="E.g. How do I request computer repair?"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-text-700">Answer</label>
                                <textarea
                                    required
                                    value={formData.answer}
                                    onChange={e => setFormData({ ...formData, answer: e.target.value })}
                                    className="w-full border rounded-md p-2.5 min-h-[120px] focus:ring-navy-600 focus:border-navy-600"
                                    placeholder="E.g. Please open a ticket via the IT Portal..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-text-500 hover:bg-surface-100 rounded font-medium">Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">
                                    {saving ? 'Saving...' : 'Save FAQ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
