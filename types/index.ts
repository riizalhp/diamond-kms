import { User, Role, Organization, Division, ContentStatus } from '@prisma/client'

export type UserWithRole = User & {
    role?: Role
    organization?: Organization & {
        industry_segment?: string
        ai_provider_config?: any
        cross_division_query_enabled?: boolean
    }
    division?: Division
}

export type APIResponse<T = any> = {
    success: boolean
    data?: T
    error?: string
}
