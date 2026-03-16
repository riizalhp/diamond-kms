
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    const user = await prisma.user.findFirst({
        where: { full_name: 'Xilasae Admin' },
        include: {
            organization: true,
            user_divisions: {
                include: { division: true }
            }
        }
    })

    if (user) {
        console.log('USER_FOUND:', user.id)
        console.log('ORG:', user.organization.name)
        console.log('ROLE:', user.user_divisions[0].role)
    } else {
        console.log('USER_NOT_FOUND')
    }
}

main().catch(console.error).finally(() => pool.end())
