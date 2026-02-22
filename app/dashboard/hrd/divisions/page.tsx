'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDivisionsAction, createDivisionAction, deleteDivisionAction } from '@/lib/actions/user.actions'
import { Plus, Trash2, Search, Edit2 } from 'lucide-react'

export default function DivisionsPage() {
    const { organization } = useCurrentUser()
    const [divisions, setDivisions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState({ type: '', msg: '' })

    const loadData = async () => {
        if (!organization?.id) return
        const res = await getDivisionsAction(organization.id)
        if (res.success) {
            setDivisions(res.data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [organization?.id])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization?.id) return

        setStatus({ type: 'loading', msg: 'Creating division...' })
        const res = await createDivisionAction({ name, description, orgId: organization.id })
        if (res.success) {
            setStatus({ type: 'success', msg: 'Division created' })
            setTimeout(() => {
                setIsModalOpen(false)
                setName('')
                setDescription('')
                setStatus({ type: '', msg: '' })
                loadData()
            }, 1000)
        } else {
            setStatus({ type: 'error', msg: res.error || 'Failed to create' })
        }
    }

    const handleDelete = async (divId: string) => {
        if (!confirm('Warning: Deleting a division cannot be undone. Make sure no users/contents are attached. Proceed?')) return

        const res = await deleteDivisionAction(divId)
        if (res.success) {
            loadData()
        } else {
            alert(res.error || 'Failed to delete division')
        }
    }

    return (
        <RoleGuard allowedRoles={['SUPER_ADMIN']}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold font-display text-navy-900">Division Management</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary"
                    >
                        <Plus size={18} /> Add Division
                    </button>
                </div>

                <div className="card">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-50 text-text-500 text-sm border-b">
                                <th className="p-4 font-medium">Division Name</th>
                                <th className="p-4 font-medium">Description</th>
                                <th className="p-4 font-medium">Members</th>
                                <th className="p-4 font-medium w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-text-500">Loading divisions...</td></tr>
                            ) : divisions.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-text-500">No divisions found.</td></tr>
                            ) : (
                                divisions.map((d) => (
                                    <tr key={d.id} className="border-b last:border-0 hover:bg-surface-50">
                                        <td className="p-4 font-medium text-navy-900">{d.name}</td>
                                        <td className="p-4 text-sm text-text-500">{d.description || '-'}</td>
                                        <td className="p-4">
                                            <span className="inline-block px-2 py-1 bg-surface-100 text-text-500 font-medium text-xs rounded border">
                                                {d._count?.user_divisions || 0} users
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleDelete(d.id)} className="p-2 text-text-300 hover:text-danger rounded-md transition" title="Delete Division">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold font-display mb-4">Create New Division</h2>

                        {status.msg && (
                            <div className={`p-3 rounded mb-4 text-sm ${status.type === 'error' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
                                {status.msg}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Division Name</label>
                                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2" placeholder="e.g. Finance" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded p-2 h-24" placeholder="Brief description of the division..."></textarea>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-text-500 hover:bg-surface-100 rounded">Cancel</button>
                                <button type="submit" disabled={status.type === 'loading'} className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </RoleGuard>
    )
}
