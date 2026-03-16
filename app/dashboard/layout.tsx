'use client'

import { useCurrentUser, UserProvider } from '@/hooks/useCurrentUser'
import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
    Home, FileText, Tags, Bot, Award, FileQuestion, Users,
    Network, CreditCard, Activity, CheckSquare, ListTodo,
    Shield, FolderTree, Settings, Menu, Sparkles, Wrench, Search, X,
    ChevronDown, ChevronRight, PanelLeftOpen, PanelLeftClose
} from 'lucide-react'
import { NotificationBell } from '@/components/shared/NotificationBell'
import SmartSearch from '@/components/search/SmartSearch'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"

// Icon mapping function
const getIconForLabel = (label: string) => {
    switch (label) {
        case 'Knowledge Base': return <Tags size={16} />
        case 'Quizzes': return <FileQuestion size={16} />
        case 'FAQ': return <Bot size={16} />
        case 'AISA': return <Sparkles size={16} />
        case 'User': return <Users size={16} />
        case 'Settings': return <Settings size={16} />
        case 'Dashboard': return <Home size={16} />
        default: return <FileText size={16} />
    }
}

// Simple sidebar mapping based on roles
const getNavLinks = (role?: string) => {
    const base = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'FAQ', href: '/dashboard/faqs' },
        { label: 'AISA', href: '/dashboard/ai-assistant' },
        { label: 'Knowledge Base', href: '/dashboard/contents' },
        { label: 'Quizzes', href: '/dashboard/quizzes' },
        { label: 'User', href: '/dashboard/hrd/users' },
        { label: 'Settings', href: '/dashboard/hrd/settings' },
    ]

    // We follow CRITICAL RULE: only these 7 menus in this exact order.
    // However, some roles might have restricted access in the original code.
    // The prompt says: "Susun ulang urutan menu HANYA menjadi: 1. Dashboard, 2. FAQ, 3. AISA, 4. Knowledge Base, 5. Quizzes, 6. User, 7. Settings."

    // For SUPER_ADMIN/GROUP_ADMIN we might need to preserve some items but the prompt is strict about the order and the list.
    // I will filter 'base' to make sure it only contains these 7.

    return base
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [openMenus, setOpenMenus] = useState<string[]>([])
    const { user, role, organization, isLoading } = useCurrentUser()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [isLoading, user, router])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin"></div>
                    <p className="text-navy-700 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    const navLinks = getNavLinks(role)

    const toggleMenu = (label: string) => {
        setOpenMenus(prev =>
            prev.includes(label)
                ? prev.filter(m => m !== label)
                : [...prev, label]
        )
    }

    const menuItems = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'FAQ', href: '/dashboard/faqs' },
        { label: 'AISA', href: '/dashboard/ai-assistant' },
        { label: 'Knowledge Base', href: '/dashboard/contents' },
        {
            label: 'Quizzes',
            href: '#',
            submenus: [
                { label: 'Quiz', href: '/dashboard/quizzes' },
                { label: 'Leaderboard', href: '/dashboard/quizzes?view=leaderboard' },
            ]
        },
        {
            label: 'User',
            href: '#',
            submenus: [
                { label: 'Anggota', href: '/dashboard/hrd/users' },
                { label: 'Divisi', href: '/dashboard/hrd/users/divisions' },
            ]
        },
        { label: 'Settings', href: '/dashboard/hrd/settings' },
    ]

    return (
        <div className="flex h-screen bg-surface-50 overflow-hidden relative">
            {/* Sidebar */}
            <aside 
                className={`bg-navy-sidebar border-r border-white/5 flex flex-col hidden md:flex shrink-0 transition-all duration-300 ease-in-out overflow-hidden shadow-2xl z-20 ${
                    isSidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
                }`}
            >
                {/* Brand Logo */}
                <div className="p-[24px_20px]">
                    <div className="font-display text-[18px] font-extrabold text-white flex items-center gap-2">
                        <span className="text-amber-400 text-[16px] leading-none">◆</span> DIAMOND
                    </div>
                    <div className="text-[10px] text-sidebar-muted mt-1 font-bold tracking-[0.05em] uppercase">
                        KNOWLEDGE MANAGEMENT
                    </div>
                    {organization?.name && (
                        <div className="text-[11px] text-sidebar-foreground mt-3 font-medium truncate border-t border-white/10 pt-3">
                            {organization.name}
                        </div>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
                    {menuItems.map(item => {
                        const hasSubmenus = !!item.submenus
                        const isOpen = openMenus.includes(item.label)
                        const isActive = item.href !== '#' && (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href))

                        if (hasSubmenus) {
                            const isAnySubActive = item.submenus?.some(sub => {
                                const [subPath, subQuery] = sub.href.split('?')
                                const isPathMatches = pathname === subPath
                                if (subQuery) {
                                    // Match specific query param like view=leaderboard
                                    return isPathMatches && searchParams.toString().includes(subQuery)
                                }
                                // For items without query, only active if pathname matches and no 'view' param is present
                                return isPathMatches && !searchParams.get('view')
                            })

                            return (
                                <div key={item.label} className="flex flex-col gap-1">
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[14px] font-medium transition-all ${isOpen || isAnySubActive
                                            ? 'text-sidebar-foreground bg-white/5 shadow-inner shadow-white/5'
                                            : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5'
                                            }`}
                                    >
                                        {isAnySubActive && (
                                            <div className="absolute left-0 w-1 h-6 bg-navy-400 rounded-r-full shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                                        )}
                                        <div className="flex items-center gap-3">
                                            <span className={isOpen || isAnySubActive ? 'text-navy-400' : 'text-sidebar-muted'}>
                                                {getIconForLabel(item.label)}
                                            </span>
                                            {item.label}
                                        </div>
                                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>

                                    {isOpen && (
                                        <div className="flex flex-col gap-1 ml-4 pl-4 border-l border-white/10 mt-1 mb-1">
                                            {item.submenus?.map(sub => {
                                                const [subPath, subQuery] = sub.href.split('?')
                                                const isSubActive = subQuery 
                                                    ? (pathname === subPath && searchParams.toString().includes(subQuery))
                                                    : (pathname === subPath && !searchParams.get('view'))

                                                return (
                                                    <Link
                                                        key={sub.href}
                                                        href={sub.href}
                                                        className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${isSubActive
                                                            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                                                            : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {sub.label}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[14px] font-medium transition-all ${isActive
                                    ? 'bg-navy-600/30 text-sidebar-foreground shadow-inner shadow-white/10'
                                    : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 w-1 h-6 bg-navy-400 rounded-r-full shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                                )}
                                <span className={isActive ? 'text-navy-400' : 'text-sidebar-muted'}>
                                    {getIconForLabel(item.label)}
                                </span>
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom User Area */}
                <div className="mt-auto p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-navy-600 to-navy-400 flex items-center justify-center text-white font-bold font-display text-xs shrink-0 shadow-md">
                            {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-sidebar-foreground truncate">
                                {user.full_name}
                            </div>
                            <div className="text-[11px] text-sidebar-muted truncate">
                                {role?.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Topbar */}
                <header className="h-[60px] bg-surface-0 border-b border-surface-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-text-400 hover:text-navy-600 hover:bg-surface-50 rounded-lg transition-all active:scale-95 border border-transparent hover:border-surface-200"
                            title={isSidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
                        >
                            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                        </button>

                        <div className="h-6 w-px bg-surface-200 mx-2 hidden sm:block" />

                        <div className="flex flex-col">
                            <div className="font-semibold text-text-900 text-sm">
                                {organization?.name || 'Workspace'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-5 items-center">
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="p-2 text-text-400 hover:text-navy-600 hover:bg-surface-100 rounded-full transition-colors">
                                    <Search size={20} />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-none bg-transparent shadow-none">
                                <div className="bg-white dark:bg-surface-0 rounded-2xl overflow-hidden max-h-[85vh] flex flex-col border dark:border-surface-100">
                                    <div className="p-4 border-b border-surface-100 dark:border-surface-100 flex items-center justify-between bg-surface-50 dark:bg-surface-50">
                                        <div className="flex items-center gap-2 text-text-900 font-bold font-display">
                                            <Search size={18} className="text-amber-500" />
                                            Smart Search
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                                        <SmartSearch />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <ThemeToggle />
                        <NotificationBell userId={user.id} />
                        <Link href="/dashboard/profile" className="flex items-center gap-2 text-sm font-medium text-text-700 hover:text-navy-600 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-600 to-navy-400 flex items-center justify-center text-white font-bold font-display text-[10px] shadow-sm">
                                {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <span className="hidden sm:inline-block">{user.full_name?.split(' ')[0]}</span>
                        </Link>
                    </div>
                </header>

                {/* Page Content area */}
                <main className="flex-1 overflow-auto bg-surface-50 p-6 md:p-8">
                    <div className="max-w-6xl mx-auto fade-in">
                        {children}
                    </div>
                </main>
            </div>


        </div>
    )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <UserProvider>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </UserProvider>
    )
}
