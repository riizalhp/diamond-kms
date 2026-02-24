'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Send, X, FileText, Loader2, Bot, User, Sparkles } from 'lucide-react'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface Citation {
    documentId: string
    documentTitle: string
    pageStart: number
    pageEnd: number
    divisionName: string
    chunkContent: string
}

export default function ChatPanel() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [streamingText, setStreamingText] = useState('')
    const [citations, setCitations] = useState<Citation[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, streamingText, scrollToBottom])

    const sendMessage = async () => {
        const question = input.trim()
        if (!question || isStreaming) return

        const userMessage: Message = { role: 'user', content: question }
        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setStreamingText('')
        setCitations([])
        setIsStreaming(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    history: messages.slice(-6),
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Chat request failed')
            }

            const reader = response.body!.getReader()
            const decoder = new TextDecoder()
            let fullResponse = ''
            let currentEvent = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const text = decoder.decode(value, { stream: true })
                const lines = text.split('\n')

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim()
                    } else if (line.startsWith('data: ') && currentEvent) {
                        try {
                            const json = JSON.parse(line.slice(6))
                            if (currentEvent === 'chunk' && json.text) {
                                fullResponse += json.text
                                setStreamingText(fullResponse)
                            } else if (currentEvent === 'citations' && json.citations) {
                                setCitations(json.citations)
                            } else if (currentEvent === 'done') {
                                setMessages((prev) => [
                                    ...prev,
                                    { role: 'assistant', content: fullResponse },
                                ])
                                setStreamingText('')
                            } else if (currentEvent === 'error') {
                                throw new Error(json.message || 'AI error')
                            }
                        } catch (parseErr) {
                            // Skip malformed data lines
                        }
                        currentEvent = ''
                    }
                }
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Gagal mendapat respons'
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `⚠️ ${errorMessage}`,
                },
            ])
            setStreamingText('')
        } finally {
            setIsStreaming(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-navy-600 text-white rounded-full p-4 shadow-lg hover:bg-navy-700 transition-all hover:scale-105 group"
            >
                <Sparkles size={24} />
                <span className="absolute -top-10 right-0 bg-navy-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    AI Knowledge Assistant
                </span>
            </button>
        )
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-navy-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Knowledge Assistant</h3>
                        <p className="text-xs text-white/70">Powered by AI & RAG</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/70 hover:text-white transition p-1"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamingText && (
                    <div className="text-center py-8 text-text-400">
                        <Bot size={40} className="mx-auto mb-3 text-navy-300" />
                        <p className="font-medium text-navy-900">Halo! 👋</p>
                        <p className="text-sm mt-1">
                            Tanyakan apapun tentang dokumen perusahaan Anda.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot size={14} className="text-navy-600" />
                            </div>
                        )}
                        <div
                            className={`rounded-xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-navy-600 text-white'
                                    : 'bg-surface-100 text-navy-900'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-7 h-7 bg-navy-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <User size={14} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Streaming text */}
                {streamingText && (
                    <div className="flex gap-2 justify-start">
                        <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot size={14} className="text-navy-600" />
                        </div>
                        <div className="bg-surface-100 text-navy-900 rounded-xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
                            <p className="whitespace-pre-wrap">{streamingText}</p>
                            <span className="animate-pulse text-navy-400">▊</span>
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {isStreaming && !streamingText && (
                    <div className="flex gap-2 justify-start">
                        <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot size={14} className="text-navy-600" />
                        </div>
                        <div className="bg-surface-100 rounded-xl px-4 py-3 flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-navy-500" />
                            <span className="text-sm text-text-500">Mencari jawaban...</span>
                        </div>
                    </div>
                )}

                {/* Citations */}
                {citations.length > 0 && !isStreaming && (
                    <div className="space-y-2 ml-9">
                        <p className="text-xs font-semibold text-text-400 uppercase tracking-wider">
                            Sumber Referensi
                        </p>
                        {citations.slice(0, 4).map((c, i) => (
                            <a
                                key={i}
                                href={`/dashboard/documents/${c.documentId}`}
                                className="block bg-surface-50 border border-surface-200 rounded-lg p-3 hover:border-navy-300 hover:bg-navy-50 transition text-xs"
                            >
                                <div className="flex items-start gap-2">
                                    <FileText size={14} className="text-navy-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-navy-900 truncate">
                                            {c.documentTitle}
                                        </p>
                                        <p className="text-text-400 mt-0.5">
                                            Hal. {c.pageStart}
                                            {c.pageEnd !== c.pageStart ? `-${c.pageEnd}` : ''} •{' '}
                                            {c.divisionName}
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-surface-200 flex-shrink-0">
                <div className="flex items-center gap-2 bg-surface-50 rounded-xl px-4 py-2 border border-surface-200 focus-within:border-navy-400 transition">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isStreaming}
                        placeholder="Tanya tentang dokumen..."
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-300"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isStreaming}
                        className="text-navy-600 hover:text-navy-700 disabled:text-text-200 transition p-1"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
