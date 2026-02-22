'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getFAQsAction(orgId: string, divisionId?: string) {
    try {
        const where: any = { organization_id: orgId }
        if (divisionId) where.division_id = divisionId

        const faqs = await prisma.fAQ.findMany({
            where,
            include: { division: true },
            orderBy: { order_index: 'asc' }
        })

        return { success: true, data: faqs }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createFAQAction(data: {
    question: string
    answer: string
    divisionId: string
    orgId: string
    userId: string
}) {
    try {
        // get highest order_index
        const lastFaq = await prisma.fAQ.findFirst({
            where: { division_id: data.divisionId },
            orderBy: { order_index: 'desc' }
        })
        const nextIndex = lastFaq ? lastFaq.order_index + 1 : 0

        const faq = await prisma.fAQ.create({
            data: {
                question: data.question,
                answer: data.answer,
                division_id: data.divisionId,
                organization_id: data.orgId,
                created_by: data.userId,
                order_index: nextIndex
            }
        })

        revalidatePath('/dashboard/faqs')
        return { success: true, data: faq }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteFAQAction(id: string) {
    try {
        await prisma.fAQ.delete({ where: { id } })
        revalidatePath('/dashboard/faqs')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
