'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Role } from '@prisma/client'
import { ReactNode } from 'react'

export function RoleGuard({
    children,
    allowedRoles,
}: {
    children: ReactNode
    allowedRoles: Role[]
}) {
    const { role, isLoading } = useCurrentUser()

    if (isLoading) return <div>Loading...</div>

    if (!role || !allowedRoles.includes(role)) {
        return (
            <div className="flex items-center justify-center p-8 text-neutral-500">
                You do not have permission to access this component.
            </div>
        )
    }

    return <>{children}</>
}
