'use server'

import prisma from '@/lib/prisma'

export async function getLeaderboardAction(orgId: string, limit: number = 20) {
    try {
        const topUsers = await prisma.userPoints.findMany({
            where: { organization_id: orgId },
            include: {
                user: {
                    include: {
                        user_divisions: {
                            include: { division: true },
                            where: { is_primary: true }
                        }
                    }
                }
            },
            orderBy: { total_points: 'desc' },
            take: limit
        })

        const mappedData = topUsers.map(record => ({
            id: record.user_id,
            name: record.user.full_name,
            jobTitle: record.user.job_title,
            division: record.user.user_divisions[0]?.division.name || 'N/A',
            points: record.total_points
        }))

        return { success: true, data: mappedData }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
