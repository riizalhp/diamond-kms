'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getQuizzesAction(orgId: string, divisionId?: string) {
    try {
        const where: any = { organization_id: orgId }
        if (divisionId) where.division_id = divisionId

        const quizzes = await prisma.quiz.findMany({
            where,
            include: {
                division: true,
                content: true,
                _count: { select: { questions: true, results: true } }
            },
            orderBy: { created_at: 'desc' }
        })

        // Fetch authors
        const userIds = quizzes.map(q => q.created_by)
        const users = await prisma.user.findMany({ where: { id: { in: userIds } } })
        const userMap = users.reduce((acc, user) => ({ ...acc, [user.id]: user.full_name }), {} as Record<string, string>)

        const data = quizzes.map(q => ({
            ...q,
            author_name: userMap[q.created_by] || 'Unknown Author'
        }))

        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getQuizByIdAction(id: string) {
    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: { orderBy: { order_index: 'asc' } },
                division: true,
                content: true
            }
        })
        if (!quiz) return { success: false, error: 'Quiz not found' }
        return { success: true, data: quiz }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createQuizAction(data: {
    title: string
    description?: string
    timeLimit?: number
    divisionId: string
    contentId?: string
    orgId: string
    userId: string
    isPublished?: boolean
    questions: Array<{
        question_text: string
        options: string[]
        correct_answer: string
    }>
}) {
    try {
        const quiz = await prisma.quiz.create({
            data: {
                title: data.title,
                description: data.description,
                time_limit_minutes: data.timeLimit,
                division_id: data.divisionId,
                content_id: data.contentId || undefined,
                organization_id: data.orgId,
                created_by: data.userId,
                is_published: data.isPublished || false,
                questions: {
                    create: data.questions.map((q, i) => ({
                        question_text: q.question_text,
                        question_type: 'MULTIPLE_CHOICE',
                        options: q.options,
                        correct_answer: q.correct_answer,
                        order_index: i
                    }))
                }
            }
        })
        revalidatePath('/dashboard/quizzes')
        return { success: true, data: quiz }
    } catch (error: any) {
        console.error("Quiz creation error:", error)
        return { success: false, error: error.message }
    }
}

export async function submitQuizResultAction(data: {
    quizId: string
    userId: string
    score: number
    answers: Record<string, string>
}) {
    try {
        const result = await prisma.quizResult.create({
            data: {
                quiz_id: data.quizId,
                user_id: data.userId,
                score: data.score,
                answers: data.answers
            }
        })

        // Award points if the user scored well (e.g., > 60%)
        if (data.score > 60) {
            const userPoints = await prisma.userPoints.findUnique({ where: { user_id: data.userId } })

            // Assume 10 points per 10% score
            const pointsEarned = Math.floor(data.score / 10) * 10

            if (userPoints) {
                await prisma.userPoints.update({
                    where: { id: userPoints.id },
                    data: { total_points: userPoints.total_points + pointsEarned }
                })
            } else {
                // If the UserPoints document doesn't exist, we should ideally fetch the orgId first
                const user = await prisma.user.findUnique({ where: { id: data.userId } })
                if (user) {
                    await prisma.userPoints.create({
                        data: {
                            user_id: user.id,
                            organization_id: user.organization_id,
                            total_points: pointsEarned
                        }
                    })
                }
            }
        }

        revalidatePath(`/dashboard/quizzes/${data.quizId}`)
        return { success: true, data: result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteQuizAction(id: string) {
    try {
        await prisma.quiz.delete({ where: { id } })
        revalidatePath('/dashboard/quizzes')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
