'use client'

import { useState, useEffect } from 'react'
import { Role } from '@prisma/client'
import { updateUserRoleAction, deactivateUserAction } from '@/lib/actions/user.actions'

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
        setStatus({ type: 'loading', msg: 'Updating user...' })

        const res = await updateUserRoleAction(user.id, role, divisionId)
        if (res.success) {
            setStatus({ type: 'success', msg: 'User updated successfully' })
            setTimeout(() => {
                onClose()
                setStatus({ type: '', msg: '' })
            }, 1000)
        } else {
            setStatus({ type: 'error', msg: res.error || 'Failed to update user' })
        }
    }

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate this user?')) return
        setStatus({ type: 'loading', msg: 'Deactivating...' })

        const res = await deactivateUserAction(user.id)
        if (res.success) {
            onClose()
        } else {
            setStatus({ type: 'error', msg: res.error || 'Failed to deactivate user' })
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Edit User: {user.full_name}</h2>

                {status.msg && (
                    <div className={`p-3 rounded mb-4 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full border rounded p-2">
                            <option value="STAFF">Staff</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="GROUP_ADMIN">Group Admin (KaDiv)</option>
                            <option value="SUPER_ADMIN">Super Admin (HRD)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Primary Division</label>
                        <select required value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="w-full border rounded p-2">
                            <option value="">Select Division...</option>
                            {divisions.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-between mt-6 pt-4 border-t">
                        <button type="button" onClick={handleDeactivate} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm">
                            Deactivate User
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                            <button type="submit" disabled={status.type === 'loading'} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
