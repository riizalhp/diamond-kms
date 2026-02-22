'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getUserNotificationsAction(userId: string) {
    try {
        const notifications = await prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 20
        })

        return { success: true, data: notifications }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function markNotificationAsReadAction(notifId: string) {
    try {
        await prisma.notification.update({
            where: { id: notifId },
            data: { is_read: true }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function markAllNotificationsAsReadAction(userId: string) {
    try {
        await prisma.notification.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
