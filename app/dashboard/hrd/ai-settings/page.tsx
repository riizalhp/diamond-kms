'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOrganizationAction, updateOrgAIConfigAction, getAvailableModelsAction } from '@/lib/actions/admin.actions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Bot, Save, Server, Key, Link as LinkIcon, Cpu, RefreshCcw, MessageSquare } from 'lucide-react'

export default function AISettingsPage() {
    const { organization } = useCurrentUser()
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    // Form State
    const [provider, setProvider] = useState('managed')
    const [endpoint, setEndpoint] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [chatModel, setChatModel] = useState('')
    const [embedModel, setEmbedModel] = useState('')
    const [autoSummaryChat, setAutoSummaryChat] = useState(false)

    // Model Discovery
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [isFetchingModels, setIsFetchingModels] = useState(false)

    const handleFetchModels = async () => {
        if (!organization?.id) return
        setIsFetchingModels(true)
        setError('')
        try {
            const res = await getAvailableModelsAction(organization.id, { provider, endpoint, apiKey })
            if (res.success && res.data) {
                setAvailableModels(res.data)
                setSuccess(`Successfully loaded ${res.data.length} models from provider.`)
            } else {
                setError(res.error || 'Failed to fetch models from the provider.')
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred fetching models.')
        } finally {
            setIsFetchingModels(false)
        }
    }
    useEffect(() => {
        async function loadConfig() {
            if (!organization?.id) return

            setIsLoading(true)
            const res = await getOrganizationAction(organization.id)
            if (res.success && res.data?.ai_provider_config) {
                const config: any = res.data.ai_provider_config
                setProvider(config.provider || 'managed')
                setEndpoint(config.endpoint || '')
                setChatModel(config.chatModel || '')
                setEmbedModel(config.embedModel || '')
                setApiKey('')
                // Load auto summary from config
                setAutoSummaryChat(config.autoSummaryChat ?? false)
            }
            setIsLoading(false)
        }

        loadConfig()
    }, [organization])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!organization?.id) return

        setIsSaving(true)
        setError('')
        setSuccess('')

        const formData = new FormData()
        formData.append('orgId', organization.id)
        formData.append('provider', provider)
        if (endpoint) formData.append('endpoint', endpoint)
        if (apiKey) formData.append('apiKey', apiKey)
        if (chatModel) formData.append('chatModel', chatModel)
        if (embedModel) formData.append('embedModel', embedModel)
        formData.append('autoSummaryChat', String(autoSummaryChat))

        const res = await updateOrgAIConfigAction(formData)

        if (res.success) {
            setSuccess('AI configuration updated successfully.')
            // clear API key field after save
            setApiKey('')
            router.refresh()
        } else {
            setError(res.error || 'Failed to update configuration.')
        }

        setIsSaving(false)
    }

    if (isLoading) {
        return <div className="p-8 text-center text-navy-500">Loading AI configuration...</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-navy-900 flex items-center gap-2">
                    <Bot className="text-amber-500" />
                    Organization AI Backend
                </h1>
                <p className="text-text-500 mt-1">Configure the AI models and endpoints used by your organization's Knowledge Base assistant.</p>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>}
            {success && <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-100 text-sm">{success}</div>}

            <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm space-y-8">

                {/* Provider Selection */}
                <div className="space-y-4">
                    <label className="block text-sm font-semibold text-navy-900">Provider Strategy</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { id: 'managed', label: 'Managed by Movio', desc: 'Default Gemini integration' },
                            { id: 'byok', label: 'Bring Your Own Key', desc: 'Auto-detects Gemini or OpenAI APIs' },
                            { id: 'self_hosted', label: 'Self-Hosted / Ollama', desc: 'Connect to a local or custom endpoint' }
                        ].map((p) => (
                            <label key={p.id} className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${provider === p.id ? 'border-amber-500 bg-amber-50/30' : 'border-surface-200 hover:border-navy-300'}`}>
                                <input
                                    type="radio"
                                    name="provider"
                                    value={p.id}
                                    checked={provider === p.id}
                                    onChange={(e) => setProvider(e.target.value)}
                                    className="pt-1 text-amber-500 focus:ring-amber-500"
                                />
                                <div className="ml-3">
                                    <div className="font-semibold text-navy-900">{p.label}</div>
                                    <div className="text-xs text-text-500 mt-0.5">{p.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Conditional Fields based on Provider */}
                {provider !== 'managed' && (
                    <div className="p-5 bg-surface-50 border border-surface-200 rounded-lg space-y-5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm font-bold text-navy-900">
                                <Server size={16} className="text-navy-500" />
                                Connection Details
                            </div>
                            <button
                                type="button"
                                onClick={handleFetchModels}
                                disabled={isFetchingModels || (provider === 'self_hosted' && !endpoint.trim())}
                                className="text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isFetchingModels ? <div className="w-3 h-3 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" /> : <RefreshCcw size={12} />}
                                Load Available Models
                            </button>
                        </div>

                        {provider === 'self_hosted' && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
                                    <LinkIcon size={14} className="text-text-400" /> Endpoint URL
                                </label>
                                <input
                                    type="url"
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                    placeholder="https://llm01.weldn.ai/olla/openai/v1"
                                    className="w-full rounded-md border-surface-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 font-mono text-sm"
                                    required={provider === 'self_hosted'}
                                />
                                <p className="text-xs text-text-400">Must be an OpenAI-compatible /v1 endpoint.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
                                <Key size={14} className="text-text-400" /> API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Leave blank to keep existing key, or enter new key..."
                                className="w-full rounded-md border-surface-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 font-mono text-sm"
                                required={provider === 'byok' && !chatModel}
                            />
                            <p className="text-xs text-text-400">
                                {provider === 'self_hosted' ? 'Optional for some Ollama setups.' : 'Required for BYOK. Securely encrypted before storage.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-surface-200 mt-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
                                    <Cpu size={14} className="text-text-400" /> Chat Model Name
                                </label>
                                {availableModels.length > 0 ? (
                                    <select
                                        value={chatModel}
                                        onChange={(e) => setChatModel(e.target.value)}
                                        className="w-full rounded-md border-surface-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 font-mono text-sm"
                                        required
                                    >
                                        <option value="" disabled>Select a model...</option>
                                        {availableModels.map(m => (
                                            <option key={`chat-${m}`} value={m}>{m}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={chatModel}
                                        onChange={(e) => setChatModel(e.target.value)}
                                        placeholder={provider === 'byok' ? 'gemini-2.5-flash / gpt-4o-mini' : 'llama3.3:70b'}
                                        className="w-full rounded-md border-surface-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 font-mono text-sm"
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
                                    <Cpu size={14} className="text-text-400" /> Embedding Model Name
                                </label>
                                {availableModels.length > 0 ? (
                                    <select
                                        value={embedModel}
                                        onChange={(e) => setEmbedModel(e.target.value)}
                                        className="w-full rounded-md border-surface-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 font-mono text-sm"
                                        required
                                    >
                                        <option value="" disabled>Select a model...</option>
                                        {availableModels.map(m => (
                                            <option key={`embed-${m}`} value={m}>{m}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={embedModel}
                                        onChange={(e) => setEmbedModel(e.target.value)}
                                        placeholder="nomic-embed-text"
                                        className="w-full rounded-md border-surface-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 font-mono text-sm"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Behavior Settings */}
                <div className="p-5 bg-surface-50 border border-surface-200 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-navy-900">
                        <MessageSquare size={16} className="text-navy-500" />
                        Chat Behavior
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className="text-sm font-medium text-navy-900">Auto-generate Chat Summary</div>
                            <div className="text-xs text-text-400 mt-0.5">Otomatis membuat ringkasan setiap percakapan setelah sesi berakhir.</div>
                        </div>
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={autoSummaryChat}
                                onChange={(e) => setAutoSummaryChat(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-100">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    )
}
