import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export const registerSchema = z.object({
    orgName: z.string().min(2),
    industrySegment: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
})

export const createContentSchema = z.object({
    title: z.string().min(3),
    body: z.string().min(10),
    category: z.string().min(2),
    is_mandatory_read: z.boolean(),
    source_documents: z.array(z.string()),
})

// More schemas to be added...
