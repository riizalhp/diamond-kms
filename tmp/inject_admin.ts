
import { PrismaClient, Role } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const connectionString = process.env.DATABASE_URL!

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    const email = 'xilasae@gmail.com'
    const password = '12345678'
    const orgName = 'Diamond Super Org'

    console.log(`Checking if user ${email} exists in Supabase...`)

    let userId: string

    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError
    
    const existingUser = listData.users.find(u => u.email === email)
    
    if (existingUser) {
        console.log('User already exists in Supabase:', existingUser.id)
        userId = existingUser.id
    } else {
        console.log('Creating new user in Supabase...')
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Xilasae Admin' }
        })
        if (userError) throw userError
        userId = userData.user.id
        console.log('User created in Supabase:', userId)
    }

    console.log('Pushing to Prisma DB...')

    try {
        await prisma.$transaction(async (tx) => {
            // Create or Find Organization
            let org = await tx.organization.findFirst({ where: { name: orgName } })
            if (!org) {
                org = await tx.organization.create({
                    data: {
                        name: orgName,
                        slug: 'diamond-admin-org',
                        industry_segment: 'IT',
                        subscription_status: 'ACTIVE',
                        ai_provider_config: { provider: 'managed' },
                    }
                })
                console.log('Organization created:', org.id)
            }

            let division = await tx.division.findFirst({ where: { organization_id: org.id, name: 'Headquarters' } })
            if (!division) {
                division = await tx.division.create({
                    data: {
                        name: 'Headquarters',
                        organization_id: org.id,
                    }
                })
                console.log('Division created:', division.id)
            }

            // Create/Update User
            const user = await tx.user.upsert({
                where: { id: userId },
                update: {
                    full_name: 'Xilasae Admin',
                    organization_id: org.id,
                    is_active: true
                },
                create: {
                    id: userId,
                    full_name: 'Xilasae Admin',
                    job_title: 'Super Admin',
                    organization_id: org.id,
                    is_active: true
                }
            })
            console.log('User profile created/updated in Prisma:', user.id)

            // Grant Role
            await tx.userDivision.upsert({
                where: {
                    user_id_division_id: {
                        user_id: user.id,
                        division_id: division.id,
                    }
                },
                update: {
                    role: Role.SUPER_ADMIN,
                    is_primary: true
                },
                create: {
                    user_id: user.id,
                    division_id: division.id,
                    role: Role.SUPER_ADMIN,
                    is_primary: true
                }
            })
            console.log('Super Admin role granted.')
        })

        console.log('SUCCESS: Account is ready!')
    } catch (e) {
        console.error('Error in Prisma transaction:', e)
        throw e
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
