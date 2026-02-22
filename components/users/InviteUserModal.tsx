'use client'

import { useState } from 'react'
import { Role } from '@prisma/client'
import { inviteUserAction } from '@/lib/actions/auth.actions'

export default function InviteUserModal({
    isOpen,
    onClose,
    divisions
}: {
    isOpen: boolean
    onClose: () => void
    divisions: any[]
}) {
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<Role>(Role.STAFF)
    const [divisionId, setDivisionId] = useState('')
    const [status, setStatus] = useState({ type: '', msg: '' })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus({ type: 'loading', msg: 'Inviting user...' })

        const res = await inviteUserAction({ email, fullName, role, divisionId })
        if (res.success) {
            setStatus({ type: 'success', msg: 'User invited successfully' })
            setTimeout(() => {
                onClose()
                setStatus({ type: '', msg: '' })
            }, 1500)
        } else {
            setStatus({ type: 'error', msg: res.error || 'Failed to invite user' })
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Invite New User</h2>

                {status.msg && (
                    <div className={`p-3 rounded mb-4 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-600' : status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border rounded p-2" />
                    </div>
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
                        <label className="block text-sm font-medium mb-1">Division</label>
                        <select required value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="w-full border rounded p-2">
                            <option value="">Select Division...</option>
                            {divisions.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button type="submit" disabled={status.type === 'loading'} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Send Invite</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
