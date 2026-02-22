import { useState, useEffect } from 'react'
import { APIResponse, UserWithRole } from '@/types'

export function useCurrentUser() {
    const [user, setUser] = useState<UserWithRole | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/me')
                const json: APIResponse<UserWithRole> = await res.json()
                if (json.success && json.data) {
                    setUser(json.data)
                } else {
                    setUser(null)
                }
            } catch (e) {
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }
        fetchUser()
    }, [])

    return {
        user,
        role: user?.role,
        division: user?.division,
        organization: user?.organization,
        isLoading
    }
}
