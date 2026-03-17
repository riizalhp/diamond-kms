'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getReviewCommentsAction(contentId: string) {
    try {
        const comments = await prisma.reviewComment.findMany({
            where: { content_id: contentId },
            orderBy: { created_at: 'desc' },
        })

        // Fetch author names
        const userIds = [...new Set(comments.map(c => c.author_id))]
        const users = await prisma.user.findMany({ where: { id: { in: userIds } } })
        const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.full_name }), {} as Record<string, string>)

        const data = comments.map(c => ({
            ...c,
            author_name: userMap[c.author_id] || 'Unknown'
        }))

        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createReviewCommentAction(data: {
    contentId: string
    authorId: string
    highlightedText: string
    comment: string
}) {
    try {
        const comment = await prisma.reviewComment.create({
            data: {
                content_id: data.contentId,
                author_id: data.authorId,
                highlighted_text: data.highlightedText,
                comment: data.comment,
            }
        })

        revalidatePath(`/dashboard/contents/${data.contentId}`)
        return { success: true, data: comment }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function resolveReviewCommentAction(commentId: string) {
    try {
        const comment = await prisma.reviewComment.update({
            where: { id: commentId },
            data: { is_resolved: true }
        })

        revalidatePath(`/dashboard/contents/${comment.content_id}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteReviewCommentAction(commentId: string) {
    try {
        const comment = await prisma.reviewComment.delete({
            where: { id: commentId }
        })

        revalidatePath(`/dashboard/contents/${comment.content_id}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
