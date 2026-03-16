import { getQuizzesAction } from '../lib/actions/quiz.actions'
import prisma from '../lib/prisma'

async function test() {
    try {
        const org = await prisma.organization.findFirst()
        if (!org) {
            console.log('No organization found to test with.')
            return
        }
        console.log(`Testing with org: ${org.id}`)
        const res = await getQuizzesAction(org.id)
        if (res.success) {
            console.log('Success! getQuizzesAction worked.')
            console.log(`Data count: ${res.data?.length}`)
        } else {
            console.error('Failed!', res.error)
        }
    } catch (e: any) {
        console.error('Exception!', e.message)
    } finally {
        await prisma.$disconnect()
    }
}

test()
