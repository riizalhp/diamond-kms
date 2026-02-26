import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
    const docs = await prisma.document.findMany({
        orderBy: { created_at: 'desc' },
        take: 3,
        include: { _count: { select: { chunks: true } } }
    })

    for (const doc of docs) {
        console.log(`\nDoc: ${doc.file_name}`)
        console.log(`Status: ${doc.processing_status}`)
        console.log(`Is Processed: ${doc.is_processed}`)
        console.log(`Chunks: ${doc._count.chunks}`)
        console.log(`Error: ${doc.processing_error}`)
        if (doc.processing_log && Array.isArray(doc.processing_log)) {
            console.log(`Last Log: ${(doc.processing_log as any[]).slice(-1)[0]?.message}`)
        }
    }
}

check().catch(console.error).finally(() => prisma.$disconnect())
