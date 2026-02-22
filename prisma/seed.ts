import { PrismaClient, Role, ContentStatus } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // 1. Create Demo Organization (IT Segment)
  const org = await prisma.organization.create({
    data: {
      name: 'Acme IT Solutions',
      slug: 'acme-it',
      industry_segment: 'IT',
      subscription_status: 'ACTIVE',
      subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Next year
      ai_provider_config: { provider: 'managed' },
    },
  })

  // 2. Create Divisions
  const engDivision = await prisma.division.create({
    data: {
      organization_id: org.id,
      name: 'Engineering',
      description: 'Software engineering team',
    },
  })

  const prodDivision = await prisma.division.create({
    data: {
      organization_id: org.id,
      name: 'Product',
      description: 'Product management team',
    },
  })

  // 3. Create Users

  // Maintainer (System Admin)
  const maintainer = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001', // Fake UUIDs for seed
      organization_id: org.id,
      full_name: 'System Maintainer',
      job_title: 'System Engineer',
      is_active: true,
      user_divisions: {
        create: {
          division_id: engDivision.id,
          role: Role.MAINTAINER,
          is_primary: true
        }
      }
    }
  })

  // Super Admin (HRD)
  const superAdmin = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000002',
      organization_id: org.id,
      full_name: 'Alice Admin',
      job_title: 'HR Director',
      is_active: true,
      user_divisions: {
        create: {
          division_id: engDivision.id,
          role: Role.SUPER_ADMIN,
          is_primary: true
        }
      }
    }
  })

  // Group Admin (KaDiv - Engineering)
  const groupAdmin = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000003',
      organization_id: org.id,
      full_name: 'Bob GroupAdmin',
      job_title: 'VP of Engineering',
      is_active: true,
      user_divisions: {
        create: {
          division_id: engDivision.id,
          role: Role.GROUP_ADMIN,
          is_primary: true
        }
      }
    }
  })

  // Supervisor - Engineering
  const supervisor = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000004',
      organization_id: org.id,
      full_name: 'Charlie Supervisor',
      job_title: 'Engineering Manager',
      is_active: true,
      user_divisions: {
        create: {
          division_id: engDivision.id,
          role: Role.SUPERVISOR,
          is_primary: true
        }
      }
    }
  })

  // Staff - Engineering
  const staff = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000005',
      organization_id: org.id,
      full_name: 'Dave Staff',
      job_title: 'Software Engineer',
      is_active: true,
      user_divisions: {
        create: {
          division_id: engDivision.id,
          role: Role.STAFF,
          is_primary: true
        }
      }
    }
  })

  // 4. Sample Content

  // DRAFT content (by supervisor)
  await prisma.content.create({
    data: {
      organization_id: org.id,
      division_id: engDivision.id,
      author_id: supervisor.id,
      title: 'Q4 Engineering Goals',
      body: '<p>Drafting the goals for Q4...</p>',
      category: 'Tech Wiki',
      status: ContentStatus.DRAFT,
    }
  })

  // PENDING_APPROVAL content (by supervisor)
  const pendingContent = await prisma.content.create({
    data: {
      organization_id: org.id,
      division_id: engDivision.id,
      author_id: supervisor.id,
      title: 'New Code Review Standards',
      body: '<p>We need to focus on performance during code reviews.</p>',
      category: 'Code Standards',
      status: ContentStatus.PENDING_APPROVAL,
    }
  })

  // Create approval queue for it
  await prisma.approvalQueue.create({
    data: {
      content_id: pendingContent.id,
      submitted_by: supervisor.id,
    }
  })

  // PUBLISHED content (by group admin)
  await prisma.content.create({
    data: {
      organization_id: org.id,
      division_id: engDivision.id,
      author_id: groupAdmin.id,
      title: 'Company Architecture Overview',
      body: '<p>This is the high level architecture of our system...</p>',
      category: 'Tech Wiki',
      status: ContentStatus.PUBLISHED,
      published_at: new Date(),
      is_mandatory_read: true,
    }
  })

  // REJECTED content (by supervisor)
  await prisma.content.create({
    data: {
      organization_id: org.id,
      division_id: engDivision.id,
      author_id: supervisor.id,
      title: 'Deprecated Library Usage',
      body: '<p>We are going to use X instead of Y.</p>',
      category: 'Code Standards',
      status: ContentStatus.REJECTED,
    }
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
