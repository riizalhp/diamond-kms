'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createQuizAction } from '@/lib/actions/quiz.actions'
import { getDivisionsAction } from '@/lib/actions/user.actions'
import { getContentsAction } from '@/lib/actions/content.actions'
import { Save, ArrowLeft, PlusCircle, Trash } from 'lucide-react'
import Link from 'next/link'

export default function CreateQuizPage() {
    const router = useRouter()
    const { user, organization } = useCurrentUser()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [timeLimit, setTimeLimit] = useState<number | ''>('')
    const [divisionId, setDivisionId] = useState('')
    const [contentId, setContentId] = useState('')
    const [isPublished, setIsPublished] = useState(true)
    const [status, setStatus] = useState({ type: '', msg: '' })

    const [divisions, setDivisions] = useState<any[]>([])
    const [contents, setContents] = useState<any[]>([])

    // Manage multiple questions dynamically
    const [questions, setQuestions] = useState([
        { question_text: '', options: ['', '', '', ''], correct_answer: '' }
    ])

    useEffect(() => {
        if (organization?.id) {
            getDivisionsAction(organization.id).then(res => {
                if (res.success) setDivisions(res.data || [])
            })
            getContentsAction(organization.id).then(res => {
                if (res.success) setContents(res.data || [])
            })
        }
    }, [organization?.id])

    const handleAddQuestion = () => {
        setQuestions([...questions, { question_text: '', options: ['', '', '', ''], correct_answer: '' }])
    }

    const handleRemoveQuestion = (index: number) => {
        const newQs = [...questions]
        newQs.splice(index, 1)
        setQuestions(newQs)
    }

    const handleQuestionChange = (index: number, field: string, value: string | string[], optionIndex?: number) => {
        const newQs = [...questions]
        if (field === 'options' && typeof optionIndex === 'number') {
            newQs[index].options[optionIndex] = value as string
        } else if (field === 'correct_answer' || field === 'question_text') {
            (newQs[index] as any)[field] = value
        }
        setQuestions(newQs)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.id || !organization?.id) return

        // Validation: Verify each question has a correct answer marked
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].correct_answer) {
                setStatus({ type: 'error', msg: `Question ${i + 1} must have a selected correct answer.` })
                return
            }
        }

        setStatus({ type: 'loading', msg: 'Saving quiz...' })

        const res = await createQuizAction({
            title,
            description,
            timeLimit: timeLimit ? Number(timeLimit) : undefined,
            divisionId,
            contentId,
            orgId: organization.id,
            userId: user.id,
            isPublished,
            questions
        })

        if (res.success) {
            setStatus({ type: 'success', msg: 'Quiz created successfully' })
            setTimeout(() => {
                router.push('/dashboard/quizzes')
            }, 1000)
        } else {
            setStatus({ type: 'error', msg: res.error || 'Failed to create quiz' })
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/quizzes" className="p-2 text-text-500 hover:text-navy-900 hover:bg-surface-100 rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold font-display text-navy-900">Create New Quiz</h1>
            </div>

            <div className="card p-6">
                {status.msg && (
                    <div className={`p-4 rounded-md mb-6 text-sm font-medium ${status.type === 'error' ? 'bg-danger-bg text-danger border border-red-200' :
                        status.type === 'success' ? 'bg-success-bg text-green-700 border border-green-200' :
                            'bg-navy-50 text-navy-700 border border-blue-200'
                        }`}>
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* General Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-md bg-surface-50">
                        <div className="space-y-2 col-span-full">
                            <label className="block text-sm font-medium text-text-700">Quiz Title *</label>
                            <input
                                required
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border-surface-200 border rounded-md p-2.5 focus:ring-navy-600 focus:border-navy-600"
                                placeholder="e.g. Employee Security Awareness 2026"
                            />
                        </div>

                        <div className="space-y-2 col-span-full">
                            <label className="block text-sm font-medium text-text-700">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border-surface-200 border rounded-md p-2.5 min-h-[80px] focus:ring-navy-600 focus:border-navy-600"
                                placeholder="Brief summary of the quiz context..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-700">Division (Target Audience) *</label>
                            <select
                                required
                                value={divisionId}
                                onChange={(e) => setDivisionId(e.target.value)}
                                className="w-full border-surface-200 border rounded-md p-2.5 focus:ring-navy-600 focus:border-navy-600 bg-white"
                            >
                                <option value="" disabled>Select Division...</option>
                                {divisions.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-700">Linked Article / Material</label>
                            <select
                                value={contentId}
                                onChange={(e) => setContentId(e.target.value)}
                                className="w-full border-surface-200 border rounded-md p-2.5 focus:ring-navy-600 focus:border-navy-600 bg-white"
                            >
                                <option value="">None (Standalone Quiz)</option>
                                {contents.map(c => (
                                    <option key={c.id} value={c.id}>[{c.category}] {c.title}</option>
                                ))}
                            </select>
                            <p className="text-xs text-text-500">Link this quiz to an existing Knowledge Base article.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text-700">Time Limit (Minutes)</label>
                            <input
                                type="number"
                                min="1"
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : '')}
                                className="w-full border-surface-200 border rounded-md p-2.5 focus:ring-navy-600 focus:border-navy-600"
                                placeholder="e.g. 15 (Leave empty for no limit)"
                            />
                        </div>

                        <div className="space-y-2 flex items-center mt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="rounded border-surface-200 text-navy-600 focus:ring-navy-600 w-5 h-5"
                                />
                                <span className="text-sm font-medium text-text-700">Publish Immediately</span>
                            </label>
                        </div>
                    </div>

                    {/* Question Builder */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="text-xl font-bold font-display text-navy-900">Quiz Questions</h2>
                        </div>

                        {questions.map((q, qIndex) => (
                            <div key={qIndex} className="p-6 border border-surface-200 rounded-lg shadow-sm bg-white relative">
                                {questions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(qIndex)}
                                        className="absolute top-4 right-4 text-text-300 hover:text-danger transition"
                                        title="Remove Question"
                                    >
                                        <Trash size={18} />
                                    </button>
                                )}

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-text-700">Question {qIndex + 1}</h3>

                                    <input
                                        required
                                        type="text"
                                        value={q.question_text}
                                        onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                                        className="w-full border-b-2 border-surface-200 p-2 focus:outline-none focus:border-navy-600 font-medium"
                                        placeholder="Type your question here..."
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        {q.options.map((opt, optIndex) => (
                                            <div key={optIndex} className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name={`correct_${qIndex}`}
                                                    required
                                                    checked={q.correct_answer === opt && opt !== ''}
                                                    onChange={() => handleQuestionChange(qIndex, 'correct_answer', opt)}
                                                    className="w-4 h-4 text-success border-surface-200 focus:ring-green-500"
                                                    disabled={!opt.trim()}
                                                    title="Mark as correct answer"
                                                />
                                                <input
                                                    required
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value
                                                        handleQuestionChange(qIndex, 'options', newVal, optIndex)
                                                        // Update correct_answer if this option was previously selected as correct
                                                        if (q.correct_answer === q.options[optIndex]) {
                                                            handleQuestionChange(qIndex, 'correct_answer', newVal)
                                                        }
                                                    }}
                                                    className={`w-full border rounded-md p-2.5 text-sm ${q.correct_answer === opt && opt !== '' ? 'bg-success-bg border-green-500 text-green-800 font-medium' : 'border-surface-200 focus:border-navy-600 focus:ring-navy-600'
                                                        }`}
                                                    placeholder={`Option ${optIndex + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-text-500 mt-2">
                                        Fill all options and select the radio button next to the correct answer.
                                    </p>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="w-full py-4 border-2 border-dashed border-surface-200 rounded-lg text-text-500 hover:text-navy-600 hover:border-blue-400 hover:bg-navy-50 transition flex items-center justify-center gap-2 font-medium"
                        >
                            <PlusCircle size={20} /> Add Another Question
                        </button>
                    </div>

                    <div className="pt-8 flex justify-end gap-3 border-t">
                        <Link
                            href="/dashboard/quizzes"
                            className="px-6 py-2.5 border border-surface-200 text-text-700 rounded-md hover:bg-surface-50 font-medium transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={status.type === 'loading'}
                            className="btn btn-primary"
                        >
                            <Save size={18} />
                            Save Quiz
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
