'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { registerOrgAction } from '@/lib/actions/auth.actions'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from 'next/link'

type RegisterFormValues = z.infer<typeof registerSchema>

const SEGMENTS = ['IT', 'Creative', 'Banking', 'Healthcare', 'Legal', 'Education']

export default function RegisterPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema)
    })

    const onSubmit = async (data: RegisterFormValues) => {
        setIsSubmitting(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('orgName', data.orgName)
            formData.append('industrySegment', data.industrySegment)
            formData.append('email', data.email)
            formData.append('password', data.password)

            // AI Configuration
            formData.append('aiProvider', data.aiProvider ?? 'managed')
            if (data.apiKey) formData.append('apiKey', data.apiKey)
            if (data.endpointUrl) formData.append('endpointUrl', data.endpointUrl)

            const res = await registerOrgAction(formData)
            if (res.success) {
                // Force them to login or redirect directly
                router.push('/login?message=Registration successful. Please log in.')
            } else {
                setError(res.error || 'Registration failed')
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div>
            <h2 className="text-2xl font-bold font-display mb-6 text-navy-900">Register Organization</h2>

            {error && (
                <div className="bg-danger-bg text-danger p-3 rounded-md mb-4 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-700">Organization Name</label>
                    <input
                        {...register('orgName')}
                        className="mt-1 block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                        placeholder="Acme Corp"
                    />
                    {errors.orgName && <p className="mt-1 text-sm text-danger">{errors.orgName.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-700">Industry Segment</label>
                    <select
                        {...register('industrySegment')}
                        className="mt-1 block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                    >
                        <option value="">Select an industry...</option>
                        {SEGMENTS.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                    </select>
                    {errors.industrySegment && <p className="mt-1 text-sm text-danger">{errors.industrySegment.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-700">Admin Email address</label>
                    <input
                        {...register('email')}
                        type="email"
                        className="mt-1 block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                        placeholder="admin@acme.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-700">Admin Password</label>
                    <input
                        {...register('password')}
                        type="password"
                        className="mt-1 block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                    />
                    {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
                </div>

                <div className="pt-4 border-t border-surface-200 mt-6">
                    <h3 className="text-lg font-medium text-navy-900 mb-2">AI Backend Preference (Optional)</h3>
                    <p className="text-sm text-text-500 mb-4">
                        Choose how your AI features are powered. You can change this later in settings.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-700 mb-1">Provider Type</label>
                            <select
                                {...register('aiProvider')}
                                className="block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                            >
                                <option value="managed">Managed by Movio (Default, Gemini)</option>
                                <option value="byok_openrouter">Bring Your Own Key (OpenRouter)</option>
                                <option value="byok_openai">Bring Your Own Key (OpenAI)</option>
                                <option value="self_hosted">Self-Hosted (Ollama / Custom)</option>
                            </select>
                            {errors.aiProvider && <p className="mt-1 text-sm text-danger">{errors.aiProvider.message}</p>}
                        </div>

                        {/* API Key field (Visible for BYOK and Self-Hosted) */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-text-700">API Key</label>
                            <input
                                {...register('apiKey')}
                                type="password"
                                className="block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                                placeholder="sk-..."
                            />
                            <p className="text-xs text-text-500">Leaving this blank for 'Managed' uses Movio's quota.</p>
                            {errors.apiKey && <p className="mt-1 text-sm text-danger">{errors.apiKey.message}</p>}
                        </div>

                        {/* Endpoint URL field (Visible for Self-Hosted) */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-text-700">Custom Endpoint URL</label>
                            <input
                                {...register('endpointUrl')}
                                type="url"
                                className="block w-full border border-surface-200 rounded-md py-2 px-3 focus:ring-navy-600 focus:border-navy-600 sm:text-sm"
                                placeholder="https://your-ollama-instance.com/api/v1"
                            />
                            <p className="text-xs text-text-500">Required if using Self-Hosted.</p>
                            {errors.endpointUrl && <p className="mt-1 text-sm text-danger">{errors.endpointUrl.message}</p>}
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Registering...' : 'Register as Super Admin'}
                    </button>
                </div>
            </form>

            <div className="mt-6 text-center text-sm">
                <p className="text-text-500">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-navy-600 hover:text-navy-600">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
