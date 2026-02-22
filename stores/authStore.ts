import { create } from 'zustand'
import { UserWithRole } from '@/types'

interface AuthState {
    user: UserWithRole | null
    isLoading: boolean
    setUser: (user: UserWithRole | null) => void
    setLoading: (isLoading: boolean) => void
    clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
    clearUser: () => set({ user: null }),
}))
