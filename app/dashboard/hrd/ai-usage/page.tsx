'use client'

import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getAIUsageAction } from '@/lib/actions/admin.actions'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { Bot, Cpu, Zap, TrendingUp, User, Clock } from 'lucide-react'

export default function AIUsagePage() {
    const { organization } = useCurrentUser()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (organization?.id) {
            getAIUsageAction(organization.id).then(res => {
                if (res.success) setData(res.data)
                setLoading(false)
            })
        }
    }, [organization?.id])

    const stats = data?.stats || { totalTokens: 0, totalRequests: 0, byAction: {} }
    const logs = data?.logs || []

    const actionColors: Record<string, string> = {
        DOCUMENT_PROCESS: 'bg-navy-100 text-navy-700',
        SMART_SEARCH: 'bg-info-bg text-info',
        SUMMARIZE: 'bg-success-bg text-success',
        GENERATE: 'bg-warning-bg text-warning',
    }

    return (
        <RoleGuard allowedRoles={['SUPER_ADMIN', 'MAINTAINER']}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-[28px] font-bold font-display text-navy-900 leading-tight">AI Usage Monitor</h1>
                    <p className="text-sm text-text-500 mt-1">Track your organization's AI token consumption and request history.</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin mb-4" />
                        <p className="text-text-500 font-medium">Loading AI stats...</p>
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div className="card p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-navy-100 text-navy-600 rounded-lg flex items-center justify-center">
                                        <Zap size={20} />
                                    </div>
                                    <p className="text-text-500 text-xs font-semibold uppercase tracking-wider">Total Tokens Used</p>
                                </div>
                                <p className="text-3xl font-black font-display text-navy-900">{stats.totalTokens.toLocaleString()}</p>
                            </div>
                            <div className="card p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-success-bg text-success rounded-lg flex items-center justify-center">
                                        <Cpu size={20} />
                                    </div>
                                    <p className="text-text-500 text-xs font-semibold uppercase tracking-wider">Total AI Requests</p>
                                </div>
                                <p className="text-3xl font-black font-display text-navy-900">{stats.totalRequests}</p>
                            </div>
                            <div className="card p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-warning-bg text-warning rounded-lg flex items-center justify-center">
                                        <TrendingUp size={20} />
                                    </div>
                                    <p className="text-text-500 text-xs font-semibold uppercase tracking-wider">Action Types</p>
                                </div>
                                <p className="text-3xl font-black font-display text-navy-900">{Object.keys(stats.byAction).length}</p>
                            </div>
                        </div>

                        {/* Usage Breakdown */}
                        {Object.keys(stats.byAction).length > 0 && (
                            <div className="card p-6">
                                <h2 className="font-bold font-display text-navy-900 mb-4 text-lg">Usage by Action Type</h2>
                                <div className="space-y-3">
                                    {Object.entries(stats.byAction).map(([action, tokens]) => {
                                        const pct = stats.totalTokens > 0 ? Math.round((tokens as number / stats.totalTokens) * 100) : 0
                                        return (
                                            <div key={action} className="space-y-1">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-text-700">{action.replace(/_/g, ' ')}</span>
                                                    <span className="text-text-500">{(tokens as number).toLocaleString()} tokens ({pct}%)</span>
                                                </div>
                                                <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                                                    <div className="h-2 bg-navy-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Recent Logs */}
                        <div className="card overflow-hidden">
                            <div className="p-5 border-b border-surface-200 bg-surface-0">
                                <h2 className="font-bold font-display text-navy-900 flex items-center gap-2">
                                    <Bot size={18} className="text-navy-600" /> Recent AI Activity
                                </h2>
                            </div>

                            {logs.length === 0 ? (
                                <div className="p-12 text-center text-text-500">
                                    <Bot size={40} className="mx-auto text-text-300 mb-3" />
                                    No AI usage recorded yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-surface-100 max-h-[500px] overflow-y-auto scrollbar-thin">
                                    {logs.map((log: any) => (
                                        <div key={log.id} className="p-4 hover:bg-surface-50 transition flex items-center gap-4">
                                            <div className="w-9 h-9 bg-surface-100 text-text-500 rounded-lg flex items-center justify-center shrink-0">
                                                <Bot size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`badge ${actionColors[log.action_type] || 'bg-surface-100 text-text-700'}`}>
                                                        {log.action_type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-xs text-text-300 flex items-center gap-1">
                                                        <User size={10} /> {log.user?.full_name || 'System'}
                                                    </span>
                                                </div>
                                                {log.model_used && (
                                                    <p className="text-xs text-text-500">Model: {log.model_used}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-navy-900">{log.tokens_used.toLocaleString()}</p>
                                                <p className="text-[10px] text-text-300 flex items-center gap-1 justify-end">
                                                    <Clock size={10} /> {new Date(log.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </RoleGuard>
    )
}
