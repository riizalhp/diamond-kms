// Script to alter vector column dimension from 768 to 1024 directly in PostgreSQL
import pg from 'pg'

const { Client } = pg

async function main() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL
    })

    await client.connect()
    console.log('Connected to database.')

    // Check current column type
    const check = await client.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    `)
    console.log('Current column info:', check.rows[0])

    // Drop old chunks with wrong dimensions (they'd be invalid anyway)
    const deleted = await client.query(`DELETE FROM document_chunks WHERE embedding IS NOT NULL`)
    console.log(`Deleted ${deleted.rowCount} old chunks with embeddings.`)

    // Alter column from vector(768) to vector(1024)
    await client.query(`ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1024)`)
    console.log('✅ Column altered to vector(1024) successfully!')

    // Verify
    const verify = await client.query(`
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    `)
    console.log('Verified column info:', verify.rows[0])

    await client.end()
    console.log('Done.')
}

main().catch(err => {
    console.error('Failed:', err)
    process.exit(1)
})
