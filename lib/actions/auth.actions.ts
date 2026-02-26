'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { success: false, error: error.message }
    }

    // Fetch the user's role to determine redirect
    const user = await prisma.user.findUnique({
        where: { id: data.user.id },
        include: {
            user_divisions: {
                where: { is_primary: true },
                select: { role: true }
            }
        }
    })

    let redirectTo = '/dashboard'
    if (user && user.user_divisions.length > 0) {
        const role = user.user_divisions[0].role
        switch (role) {
            case Role.SUPER_ADMIN:
                redirectTo = '/dashboard/hrd/users'
                break
            case Role.GROUP_ADMIN:
            case Role.SUPERVISOR:
            case Role.STAFF:
                redirectTo = '/dashboard'
                break
            case Role.MAINTAINER:
                redirectTo = '/dashboard/maintainer'
                break
        }
    }

    return { success: true, redirectTo }
}

export async function logoutAction() {
    const supabase = createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function registerOrgAction(formData: FormData) {
    const orgName = formData.get('orgName') as string
    const industrySegment = formData.get('industrySegment') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // AI Configuration
    const aiProvider = (formData.get('aiProvider') as string) || 'managed'
    const apiKey = formData.get('apiKey') as string | undefined
    const endpointUrl = formData.get('endpointUrl') as string | undefined

    const supabase = createClient()

    // 1. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    })

    if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create user' }
    }

    // Build AI config object and encrypt key if needed
    // Dynamic import to avoid crypto issues on edge if any
    const { encrypt } = await import('@/lib/security/key-encryptor')
    let aiConfig: any = { provider: aiProvider }

    if (aiProvider === 'byok') {
        if (!apiKey) return { success: false, error: 'API Key is required for BYOK' }
        aiConfig.encryptedKey = encrypt(apiKey)
    } else if (aiProvider === 'self_hosted') {
        if (!endpointUrl) return { success: false, error: 'Endpoint URL required for Self-Hosted' }
        aiConfig.endpoint = endpointUrl
        if (apiKey) aiConfig.encryptedKey = encrypt(apiKey)
    }

    try {
        // 2. Transaction to create Org, User, Division, and UserDivision
        await prisma.$transaction(async (tx) => {
            // Create Organization
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    industry_segment: industrySegment,
                    subscription_status: 'TRIAL',
                    ai_provider_config: aiConfig,
                }
            })

            // Create Initial Division
            const division = await tx.division.create({
                data: {
                    name: 'Headquarters',
                    organization_id: org.id,
                }
            })

            // Create User
            const user = await tx.user.create({
                data: {
                    id: authData.user!.id,
                    organization_id: org.id,
                    full_name: orgName + ' Admin',
                    job_title: 'Super Admin',
                }
            })

            // Assign SUPER_ADMIN role
            await tx.userDivision.create({
                data: {
                    user_id: user.id,
                    division_id: division.id,
                    role: Role.SUPER_ADMIN,
                    is_primary: true,
                }
            })
        })

        return { success: true }
    } catch (dbError: any) {
        // If DB fails, we should ideally rollback Supabase user, omitted for brevity
        return { success: false, error: dbError.message }
    }
}

export async function inviteUserAction({
    email,
    password,
    fullName,
    jobTitle,
    role,
    divisionId,
}: {
    email: string
    password: string
    fullName: string
    jobTitle?: string
    role: string
    divisionId: string
}) {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { success: false, error: 'Unauthorized' }

    // Get current user org
    const inviter = await prisma.user.findUnique({ where: { id: currentUser.id } })
    if (!inviter) return { success: false, error: 'Inviter not found' }

    // Validate password
    if (!password || password.length < 6) {
        return { success: false, error: 'Password minimal 6 karakter' }
    }

    try {
        // Use Supabase Admin API with service_role key — NO email sent, NO rate limit
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,  // Auto-confirm, no verification email
            user_metadata: { full_name: fullName },
        })

        if (authError || !authData.user) {
            return { success: false, error: authError?.message || 'Gagal membuat akun' }
        }

        // Create User + UserDivision in Prisma
        await prisma.$transaction(async (tx) => {
            await tx.user.create({
                data: {
                    id: authData.user.id,
                    organization_id: inviter.organization_id,
                    full_name: fullName,
                    job_title: jobTitle || null,
                },
            })

            await tx.userDivision.create({
                data: {
                    user_id: authData.user.id,
                    division_id: divisionId,
                    role: role as Role,
                    is_primary: true,
                },
            })
        })

        revalidatePath('/dashboard/hrd/users')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Gagal membuat user' }
    }
}

