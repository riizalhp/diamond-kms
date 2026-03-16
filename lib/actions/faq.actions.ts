'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getFAQsAction(orgId: string) {
    try {
        const faqs = await prisma.fAQ.findMany({
            where: { organization_id: orgId },
            take: 10,
            orderBy: { created_at: 'desc' }
        })

        return { success: true, data: faqs }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createFAQAction(data: {
    question: string
    answer: string
    orgId: string
    userId: string
}) {
    try {
        const count = await prisma.fAQ.count({
            where: { organization_id: data.orgId }
        })

        if (count >= 10) {
            return { success: false, error: "Kuota FAQ Penuh (Maks 10)" }
        }

        const faq = await prisma.fAQ.create({
            data: {
                question: data.question,
                answer: data.answer,
                organization_id: data.orgId,
                created_by: data.userId,
                order_index: count
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
