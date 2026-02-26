'use client'

import { useState, useEffect } from 'react'
import { Role } from '@prisma/client'
import { updateUserRoleAction, deactivateUserAction } from '@/lib/actions/user.actions'
import { X, Save, UserX, Loader2 } from 'lucide-react'

export default function EditUserModal({
    isOpen,
    onClose,
    user,
    divisions
}: {
    isOpen: boolean
    onClose: () => void
    user: any
    divisions: any[]
}) {
    const [role, setRole] = useState<Role>(Role.STAFF)
    const [divisionId, setDivisionId] = useState('')
    const [status, setStatus] = useState({ type: '', msg: '' })

    useEffect(() => {
        if (user && user.user_divisions?.length > 0) {
            setRole(user.user_divisions[0].role)
            setDivisionId(user.user_divisions[0].division_id)
        }
    }, [user])

    if (!isOpen || !user) return null

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus({ type: 'loading', msg: 'Memperbarui user...' })

        const res = await updateUserRoleAction(user.id, role, divisionId)
        if (res.success) {
            setStatus({ type: 'success', msg: 'User berhasil diperbarui' })
            setTimeout(() => {
                onClose()
                setStatus({ type: '', msg: '' })
            }, 1000)
        } else {
            setStatus({ type: 'error', msg: res.error || 'Gagal memperbarui user' })
        }
    }

    const handleDeactivate = async () => {
        if (!confirm('Apakah Anda yakin ingin menonaktifkan user ini?')) return
        setStatus({ type: 'loading', msg: 'Menonaktifkan...' })

        const res = await deactivateUserAction(user.id)
        if (res.success) {
            onClose()
        } else {
            setStatus({ type: 'error', msg: res.error || 'Gagal menonaktifkan user' })
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-navy-600 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold font-display">Edit User</h2>
                        <p className="text-sm text-white/70 mt-0.5">{user.full_name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status.msg && (
                        <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100'
                                : status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100'
                                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                            {status.msg}
                        </div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-navy-900 mb-1">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as Role)}
                                className="w-full border border-surface-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition bg-white"
                            >
                                <option value="STAFF">Staff</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="GROUP_ADMIN">Group Admin (KaDiv)</option>
                                <option value="SUPER_ADMIN">Super Admin (HRD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-navy-900 mb-1">Divisi Utama</label>
                            <select
                                required
                                value={divisionId}
                                onChange={(e) => setDivisionId(e.target.value)}
                                className="w-full border border-surface-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition bg-white"
                            >
                                <option value="">Pilih Divisi...</option>
                                {divisions.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-between pt-4 border-t border-surface-100">
                            <button
                                type="button"
                                onClick={handleDeactivate}
                                className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1.5"
                            >
                                <UserX size={16} />
                                Nonaktifkan
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-sm font-medium text-text-600 hover:bg-surface-100 rounded-lg transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={status.type === 'loading'}
                                    className="px-5 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {status.type === 'loading' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
