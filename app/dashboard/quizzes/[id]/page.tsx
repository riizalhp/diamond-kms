'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getQuizByIdAction, submitQuizResultAction } from '@/lib/actions/quiz.actions'
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function TakeQuizPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useCurrentUser()

    const [quiz, setQuiz] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [result, setResult] = useState<any>(null)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    useEffect(() => {
        if (params.id) {
            getQuizByIdAction(params.id as string).then(res => {
                if (res.success && res.data) {
                    setQuiz(res.data)
                    // Simple timer logic (client-side only for MVP)
                    if (res.data.time_limit_minutes) {
                        setTimeLeft(res.data.time_limit_minutes * 60)
                    }
                }
                setLoading(false)
            })
        }
    }, [params.id])

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || result) return

        const tick = setTimeout(() => {
            setTimeLeft(prev => prev! - 1)
        }, 1000)

        if (timeLeft === 1) {
            // Auto-submit when time runs out
            handleSubmit()
        }

        return () => clearTimeout(tick)
    }, [timeLeft, result])

    const handleOptionSelect = (questionId: string, option: string) => {
        if (result) return // prevent changing answers after submit
        setAnswers({ ...answers, [questionId]: option })
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!user || !quiz) return
        setSubmitting(true)

        // Calculate score
        let correctCount = 0
        quiz.questions.forEach((q: any) => {
            if (answers[q.id] === q.correct_answer) {
                correctCount++
            }
        })
        const score = Math.round((correctCount / quiz.questions.length) * 100)

        const res = await submitQuizResultAction({
            quizId: quiz.id,
            userId: user.id,
            score,
            answers
        })

        if (res.success) {
            setResult({ score, correctCount, total: quiz.questions.length })
        } else {
            alert(res.error || 'Failed to submit quiz results.')
        }
        setSubmitting(false)
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Quiz...</div>
    if (!quiz) return <div className="p-8 text-center text-danger">Quiz not found</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
                <Link href="/dashboard/quizzes" className="p-2 text-text-500 hover:text-navy-900 hover:bg-surface-100 rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold font-display text-navy-900">{quiz.title}</h1>
                    {quiz.description && <p className="text-text-500 text-sm mt-1">{quiz.description}</p>}
                </div>

                {timeLeft !== null && !result && (
                    <div className={`flex items-center gap-2 px-4 py-2 font-bold font-display rounded-lg ${timeLeft < 60 ? 'bg-danger-bg text-red-700 animate-pulse' : 'bg-surface-100 text-text-700'}`}>
                        <Clock size={18} />
                        {formatTime(timeLeft)}
                    </div>
                )}
            </div>

            {result ? (
                <div className="bg-white p-8 rounded-xl shadow-sm border text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-green-100 text-success rounded-full flex items-center justify-center">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold font-display text-navy-900">Quiz Completed!</h2>
                    <p className="text-lg text-text-500">
                        You scored <span className="font-bold font-display text-navy-600 text-2xl mx-1">{result.score}%</span>
                        ({result.correctCount} out of {result.total} correct)
                    </p>

                    {result.score >= 60 ? (
                        <p className="text-success font-medium bg-success-bg p-3 rounded-lg inline-block">
                            🎉 Excellent! You have been awarded {Math.floor(result.score / 10) * 10} Leaderboard Points.
                        </p>
                    ) : (
                        <p className="text-orange-600 font-medium bg-orange-50 p-3 rounded-lg inline-block">
                            💡 You might want to review the materials and try again later.
                        </p>
                    )}

                    <div className="pt-6 border-t mt-6">
                        <Link href="/dashboard/quizzes" className="inline-block px-6 py-2.5 bg-navy-900 text-white rounded hover:bg-navy-900 transition font-medium">
                            Return to Quizzes
                        </Link>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {quiz.questions.map((q: any, i: number) => (
                        <div key={q.id} className="card-sm border p-6">
                            <h3 className="font-semibold text-lg text-navy-900 mb-4 tracking-tight">
                                <span className="text-navy-600 mr-2">{i + 1}.</span> {q.question_text}
                            </h3>

                            <div className="space-y-3">
                                {Array.isArray(q.options) && q.options.map((opt: string, optIdx: number) => (
                                    <label
                                        key={optIdx}
                                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${answers[q.id] === opt
                                            ? 'border-navy-600 bg-navy-50 text-blue-900'
                                            : 'border-surface-200 hover:border-surface-200 bg-white text-text-700'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            value={opt}
                                            checked={answers[q.id] === opt}
                                            required
                                            onChange={() => handleOptionSelect(q.id, opt)}
                                            className="w-4 h-4 text-navy-600 border-surface-200 focus:ring-navy-600 ml-2"
                                        />
                                        <span className="ml-3 font-medium">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={submitting || Object.keys(answers).length < quiz.questions.length}
                            className="btn btn-primary"
                        >
                            {submitting ? 'Submitting...' : 'Submit Answers'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
