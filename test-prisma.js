const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const chunks = await prisma.documentChunk.findMany({ take: 5 });
    console.log('Chunks:', chunks.length);
    const docs = await prisma.document.findMany({
        include: { _count: { select: { chunks: true } } },
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.log('Docs with chunk count:', JSON.stringify(docs, null, 2));
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); });
