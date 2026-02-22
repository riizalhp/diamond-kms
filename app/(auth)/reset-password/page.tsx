'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setMessage('')

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile`,
            })

            if (error) {
                setStatus('error')
                setMessage(error.message)
            } else {
                setStatus('success')
                setMessage('Check your email for the password reset link.')
            }
        } catch (err: any) {
            setStatus('error')
            setMessage(err.message)
        }
    }

    return (
        <div>
            <h2 className="text-2xl font-bold font-display mb-6 text-navy-900">Reset your password</h2>
            <p className="text-sm text-text-500 mb-6">
                Enter your email address and we will send you a link to reset your password.
            </p>

            {status === 'error' && (
                <div className="bg-danger-bg text-danger p-3 rounded-md mb-4 text-sm">
                    {message}
                </div>
            )}

            {status === 'success' && (
                <div className="bg-success-bg text-green-700 p-3 rounded-md mb-4 text-sm">
                    {message}
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-700">Email address</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full border border-surface-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-600 disabled:opacity-50"
                >
                    {status === 'loading' ? 'Sending...' : 'Send reset link'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <Link href="/login" className="font-medium text-navy-600 hover:text-navy-600">
                    Back to sign in
                </Link>
            </div>
        </div>
    )
}
