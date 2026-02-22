'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ── Feature Flags ──
export async function getFeatureFlagsAction(orgId: string) {
    try {
        const flags = await prisma.featureFlag.findMany({
            where: { organization_id: orgId },
            orderBy: { flag_key: 'asc' }
        })
        return { success: true, data: flags }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function toggleFeatureFlagAction(flagId: string, enabled: boolean) {
    try {
        await prisma.featureFlag.update({
            where: { id: flagId },
            data: { is_enabled: enabled }
        })
        revalidatePath('/dashboard/hrd/settings')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createFeatureFlagAction(orgId: string, flagKey: string) {
    try {
        const flag = await prisma.featureFlag.create({
            data: {
                organization_id: orgId,
                flag_key: flagKey,
                is_enabled: true
            }
        })
        revalidatePath('/dashboard/hrd/settings')
        return { success: true, data: flag }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ── Subscriptions / Billing ──
export async function getSubscriptionAction(orgId: string) {
    try {
        const sub = await prisma.subscription.findFirst({
            where: { organization_id: orgId, is_active: true },
            orderBy: { started_at: 'desc' }
        })

        const invoices = await prisma.invoice.findMany({
            where: { organization_id: orgId },
            orderBy: { created_at: 'desc' },
            take: 10
        })

        return { success: true, data: { subscription: sub, invoices } }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ── AI Usage Logs ──
export async function getAIUsageAction(orgId: string) {
    try {
        const logs = await prisma.aIUsageLog.findMany({
            where: { organization_id: orgId },
            include: { user: { select: { full_name: true } } },
            orderBy: { created_at: 'desc' },
            take: 100
        })

        // Aggregate stats
        const totalTokens = logs.reduce((sum, l) => sum + l.tokens_used, 0)
        const byAction = logs.reduce((acc, l) => {
            acc[l.action_type] = (acc[l.action_type] || 0) + l.tokens_used
            return acc
        }, {} as Record<string, number>)

        return {
            success: true,
            data: {
                logs,
                stats: {
                    totalTokens,
                    totalRequests: logs.length,
                    byAction
                }
            }
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ── Organization Settings ──
export async function getOrganizationAction(orgId: string) {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                _count: {
                    select: {
                        users: true,
                        divisions: true,
                        documents: true,
                        contents: true
                    }
                }
            }
        })
        return { success: true, data: org }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateOrganizationAction(orgId: string, data: {
    name?: string
    crossDivisionQueryEnabled?: boolean
}) {
    try {
        await prisma.organization.update({
            where: { id: orgId },
            data: {
                name: data.name,
                cross_division_query_enabled: data.crossDivisionQueryEnabled
            }
        })
        revalidatePath('/dashboard/hrd/settings')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
