'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="w-10 h-10" />

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-text-400 hover:text-navy-600 hover:bg-surface-100 dark:hover:bg-navy-800 rounded-full transition-all duration-300 relative group overflow-hidden"
            aria-label="Toggle theme"
        >
            <div className="relative w-5 h-5">
                <Sun className={`absolute inset-0 transform transition-all duration-500 rotate-0 scale-100 dark:-rotate-90 dark:scale-0`} size={20} />
                <Moon className={`absolute inset-0 transform transition-all duration-500 rotate-90 scale-0 dark:rotate-0 dark:scale-100`} size={20} />
            </div>

            {/* Subtle glow effect on hover */}
            <span className="absolute inset-0 bg-navy-600/5 dark:bg-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    )
}
