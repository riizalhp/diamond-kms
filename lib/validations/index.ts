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
    aiProvider: z.enum(['managed', 'byok', 'self_hosted']).optional(),
    apiKey: z.string().optional(),
    endpointUrl: z.string().optional(),
    chatModel: z.string().optional(),
    embedModel: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.aiProvider === 'byok' && !data.apiKey) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "API Key is required for Bring-Your-Own-Key providers",
            path: ["apiKey"]
        });
    }
    if (data.aiProvider === 'self_hosted' && !data.endpointUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Endpoint URL is required for Self-Hosted providers",
            path: ["endpointUrl"]
        });
    }
})

export const createContentSchema = z.object({
    title: z.string().min(3),
    body: z.string().min(10),
    category: z.string().min(2),
    is_mandatory_read: z.boolean(),
    source_documents: z.array(z.string()),
})

// More schemas to be added...
