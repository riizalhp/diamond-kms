'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getContentByIdAction, publishContentAction } from '@/lib/actions/content.actions'
import { submitForApprovalAction } from '@/lib/actions/approval.actions'
import { checkAcknowledgeStatusAction, acknowledgeReadAction } from '@/lib/actions/read-tracker.actions'
import { createSuggestionAction } from '@/lib/actions/suggestion.actions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ArrowLeft, Edit, FileText, CheckCircle, ExternalLink, Send, MessageSquarePlus } from 'lucide-react'
import Link from 'next/link'

export default function ContentDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user, role } = useCurrentUser()

    const [content, setContent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [isAcknowledged, setIsAcknowledged] = useState(false)
    const [acknowledging, setAcknowledging] = useState(false)

    // Suggestion state
    const [suggestionText, setSuggestionText] = useState('')
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [suggestionMsg, setSuggestionMsg] = useState('')

    useEffect(() => {
        if (params.id) {
            loadContent(params.id as string)
        }
    }, [params.id])

    const loadContent = async (id: string, currentUserId?: string) => {
        const res = await getContentByIdAction(id)
        if (res.success && res.data) {
            setContent(res.data)

            // Check read tracker if it's mandatory
            if (res.data.is_mandatory_read && currentUserId) {
                const ackRes = await checkAcknowledgeStatusAction(id, currentUserId)
                if (ackRes.success) {
                    setIsAcknowledged(ackRes.isAcknowledged || false)
                }
            }
        }
        setLoading(false)
    }

    // Effect for when user ID resolves
    useEffect(() => {
        if (params.id && user?.id) {
            // we already triggered without user.id in the first load?
            // Safer to just re-load acknowledging state
            if (content?.is_mandatory_read) {
                checkAcknowledgeStatusAction(params.id as string, user.id).then(ackRes => {
                    if (ackRes.success) setIsAcknowledged(ackRes.isAcknowledged || false)
                })
            }
        }
    }, [user?.id, content?.is_mandatory_read, params.id])

    // Initial load
    useEffect(() => {
        if (params.id) {
            loadContent(params.id as string, user?.id)
        }
    }, [params.id, user?.id])

    const handleAcknowledge = async () => {
        if (!user || isAcknowledged) return
        setAcknowledging(true)
        const res = await acknowledgeReadAction(content.id, user.id)
        if (res.success) {
            setIsAcknowledged(true)
            alert('Successfully acknowledged! 50 Points awarded.')
        } else {
            alert(res.error || 'Failed to acknowledge')
        }
        setAcknowledging(false)
    }

    const handleAddSuggestion = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !suggestionText.trim()) return
        setIsSuggesting(true)

        const res = await createSuggestionAction(content.id, user.id, suggestionText)
        if (res.success) {
            setSuggestionMsg('Thank you! Your revision suggestion has been sent to the managers.')
            setSuggestionText('')
        } else {
            setSuggestionMsg(res.error || 'Failed to submit suggestion.')
        }
        setIsSuggesting(false)
        setTimeout(() => setSuggestionMsg(''), 5000)
    }

    const handleSubmitApproval = async () => {
        if (!user || !confirm('Submit this article for approval?')) return
        setPublishing(true)
        const res = await submitForApprovalAction(content.id, user.id)
        if (res.success) {
            alert('Article submitted for approval!')
            loadContent(content.id)
        } else {
            alert(res.error || 'Failed to submit')
        }
        setPublishing(false)
    }

    const handlePublish = async () => {
        if (!confirm('Are you sure you want to logically publish this article?')) return
        setPublishing(true)

        const res = await publishContentAction(content.id)
        if (res.success) {
            alert('Article successfully published')
            loadContent(content.id)
        } else {
            alert(res.error || 'Failed to publish')
        }
        setPublishing(false)
    }

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Document...</div>
    if (!content) return <div className="p-8 text-center text-danger">Article not found</div>

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
                <Link href="/dashboard/contents" className="p-2 text-text-500 hover:text-navy-900 hover:bg-surface-100 rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded uppercase tracking-wider ${content.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                            content.status === 'PENDING_APPROVAL' ? 'bg-orange-100 text-orange-700' :
                                'bg-surface-200 text-text-700'
                            }`}>
                            {content.status}
                        </span>
                        {content.is_mandatory_read && (
                            <span className="inline-block px-2.5 py-0.5 bg-danger-bg text-red-700 text-xs font-semibold rounded uppercase tracking-wider">
                                Mandatory Read
                            </span>
                        )}
                        <span className="text-sm font-medium text-text-500 bg-surface-100 px-2 py-0.5 rounded border">
                            {content.category}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Simplified roles: Any authoring admin can publish for MVP */}
                    {content.status === 'DRAFT' && (
                        <button
                            onClick={handleSubmitApproval}
                            disabled={publishing}
                            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
                        >
                            <Send size={18} />
                            Request Approval
                        </button>
                    )}

                    {['SUPER_ADMIN', 'GROUP_ADMIN', 'MAINTAINER'].includes(role || '') && content.status !== 'PUBLISHED' && (
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition flex items-center gap-2"
                        >
                            <CheckCircle size={18} />
                            Direct Publish
                        </button>
                    )}

                    {['SUPER_ADMIN', 'GROUP_ADMIN', 'SUPERVISOR', 'MAINTAINER'].includes(role || '') && (
                        <button className="px-4 py-2 border border-navy-600 text-navy-600 font-medium rounded-md hover:bg-navy-50 transition flex items-center gap-2">
                            <Edit size={18} />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-8 md:p-12 min-h-[60vh] relative">
                <h1 className="text-4xl font-extrabold text-navy-900 mb-6 leading-tight tracking-tight">
                    {content.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 pb-6 border-b text-sm text-text-500">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-700">Author:</span>
                        {content.author_name}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-700">Division:</span>
                        {content.division?.name || 'Globally Visible'}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-700">Created:</span>
                        {new Date(content.created_at).toLocaleDateString()}
                    </div>
                    {content.published_at && (
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-700">Published:</span>
                            {new Date(content.published_at).toLocaleDateString()}
                        </div>
                    )}
                </div>

                {/* HTML rendering area */}
                <article
                    className="prose prose-slate prose-lg max-w-none prose-headings:font-bold font-display prose-headings:tracking-tight prose-a:text-navy-600 pt-2"
                    dangerouslySetInnerHTML={{ __html: content.body }}
                />

                {content.source_documents && content.source_documents.length > 0 && (
                    <div className="mt-16 pt-6 border-t">
                        <h4 className="font-bold font-display text-navy-900 flex items-center gap-2 mb-4">
                            <FileText size={18} className="text-navy-600" /> Source References
                        </h4>
                        <ul className="space-y-2">
                            {content.source_documents.map((docPath: string, idx: number) => (
                                <li key={idx} className="flex flex-row items-center gap-2 text-sm text-navy-600 hover:underline cursor-pointer">
                                    <ExternalLink size={14} /> {docPath.split('/').pop() || docPath}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Action Bar for employees (Read Tracker) */}
            {content.is_mandatory_read && content.status === 'PUBLISHED' && (
                <div className={`border rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-8 ${isAcknowledged ? 'bg-success-bg border-green-200' : 'bg-navy-50 border-blue-200'
                    }`}>
                    <div>
                        <h3 className={`font-bold font-display ${isAcknowledged ? 'text-green-900' : 'text-blue-900'}`}>
                            {isAcknowledged ? 'Acknowledgment Completed' : 'Mandatory Acknowledgment Required'}
                        </h3>
                        <p className={`text-sm ${isAcknowledged ? 'text-green-700' : 'text-navy-700'}`}>
                            {isAcknowledged
                                ? 'You have confirmed reading this document. The points have been added to your profile.'
                                : 'By clicking acknowledge, you confirm you have read and understood this document.'}
                        </p>
                    </div>

                    {isAcknowledged ? (
                        <div className="px-6 py-2.5 bg-green-100 text-green-800 rounded shadow-sm font-medium flex items-center gap-2 whitespace-nowrap border border-green-200 cursor-default">
                            <CheckCircle size={18} />
                            Acknowledged
                        </div>
                    ) : (
                        <button
                            onClick={handleAcknowledge}
                            disabled={acknowledging}
                            className="btn btn-primary"
                        >
                            {acknowledging ? 'Processing...' : 'I Acknowledge (Gain 50 Pts)'}
                        </button>
                    )}
                </div>
            )}

            {/* Feedback / Suggestion Form (Only for published articles) */}
            {content.status === 'PUBLISHED' && (
                <div className="bg-surface-50 border border-surface-200 rounded-lg p-6 md:p-8 mt-6">
                    <h3 className="font-bold font-display text-navy-900 flex items-center gap-2 mb-2">
                        <MessageSquarePlus size={18} className="text-orange-500" />
                        Found an error or outdated procedure in this article?
                    </h3>
                    <p className="text-sm text-text-500 mb-4">
                        Submit a revision suggestion. Your feedback will be reviewed by the division managers to keep our Knowledge Base up-to-date.
                    </p>

                    {suggestionMsg && (
                        <div className="p-3 bg-success-bg text-green-700 text-sm font-medium rounded-md mb-4 border border-green-200">
                            {suggestionMsg}
                        </div>
                    )}

                    <form onSubmit={handleAddSuggestion}>
                        <textarea
                            value={suggestionText}
                            onChange={(e) => setSuggestionText(e.target.value)}
                            className="w-full border-surface-200 border rounded-md p-3 focus:ring-navy-600 focus:border-navy-600 min-h-[100px] text-sm"
                            placeholder="Describe what needs to be changed and why..."
                            required
                        />
                        <div className="flex justify-end mt-3">
                            <button
                                type="submit"
                                disabled={isSuggesting || !suggestionText.trim()}
                                className="px-5 py-2 bg-navy-900 text-white text-sm font-medium rounded hover:bg-navy-900 transition disabled:opacity-50"
                            >
                                {isSuggesting ? 'Submitting...' : 'Submit Suggestion'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
