'use server'

import prisma from '@/lib/prisma'

export async function getLeaderboardAction(orgId: string, limit: number = 50, divisionId?: string, quizId?: string) {
    try {
        // CASE 1: GLOBAL LEADERBOARD (Total Points from UserPoints table)
        if (!quizId || quizId === 'ALL') {
            const where: any = { organization_id: orgId }
            
            if (divisionId && divisionId !== 'ALL') {
                where.user = {
                    user_divisions: {
                        some: { division_id: divisionId }
                    }
                }
            }

            const data = await prisma.userPoints.findMany({
                where,
                orderBy: { total_points: 'desc' },
                take: limit,
                include: {
                    user: {
                        include: {
                            user_divisions: {
                                include: { division: true }
                            }
                        }
                    }
                }
            })

            const mappedData = data.map(record => {
                const primaryDiv = record.user.user_divisions.find(ud => ud.is_primary) || record.user.user_divisions[0]
                return {
                    id: record.id,
                    userId: record.user_id,
                    name: record.user.full_name,
                    division: primaryDiv?.division.name || 'N/A',
                    jobTitle: record.user.job_title,
                    quizTitle: 'Seluruh Aktivitas (Kuis & Baca)',
                    points: record.total_points,
                    completedAt: record.updated_at
                }
            })

            return { success: true, data: mappedData }
        }

        // CASE 2: SPECIFIC QUIZ LEADERBOARD
        const where: any = {
            quiz: { organization_id: orgId },
            quiz_id: quizId
        }

        if (divisionId && divisionId !== 'ALL') {
            where.user = {
                user_divisions: {
                    some: { division_id: divisionId }
                }
            }
        }

        const data = await prisma.quizResult.findMany({
            where,
            orderBy: { score: 'desc' },
            take: limit,
            include: {
                user: {
                    include: {
                        user_divisions: {
                            include: { division: true }
                        }
                    }
                },
                quiz: {
                    select: { id: true, title: true }
                }
            }
        });

        const mappedData = data.map(record => {
            const primaryDiv = record.user.user_divisions.find(ud => ud.is_primary) || record.user.user_divisions[0];
            return {
                id: record.id,
                userId: record.user_id,
                name: record.user.full_name,
                division: primaryDiv?.division.name || 'N/A',
                jobTitle: record.user.job_title,
                quizTitle: record.quiz.title,
                points: record.score,
                completedAt: record.completed_at
            }
        })

        return { success: true, data: mappedData }
    } catch (error: any) {
        console.error('[getLeaderboardAction] Error:', error)
        return { success: false, error: error.message }
    }
}
