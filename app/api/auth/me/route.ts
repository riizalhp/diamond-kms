import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                organization: {
                    include: {
                        feature_flags: true,
                    }
                },
                user_divisions: {
                    where: { is_primary: true },
                    include: {
                        division: true,
                    }
                }
            }
        })

        if (!userProfile) {
            return NextResponse.json({ success: false, error: 'User profile not found in DB' }, { status: 404 })
        }

        const primaryDivision = userProfile.user_divisions[0]

        return NextResponse.json({
            success: true,
            data: {
                ...userProfile,
                role: primaryDivision?.role,
                division: primaryDivision?.division,
            }
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
