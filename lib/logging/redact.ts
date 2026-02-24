// lib/logging/redact.ts
// Logger with automatic redaction of sensitive data (API keys, tokens)

const SENSITIVE_PATTERNS = [
    /(?:key|token|secret|password|authorization)[=:]\s*["']?([a-zA-Z0-9_\-./+=]{10,})["']?/gi,
    /AIza[a-zA-Z0-9_\-]{33}/g, // Google API keys
    /sk-[a-zA-Z0-9]{20,}/g, // OpenAI keys
    /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+/g, // JWT tokens
]

function redact(input: string): string {
    let result = input
    for (const pattern of SENSITIVE_PATTERNS) {
        result = result.replace(pattern, '[REDACTED]')
    }
    return result
}

function formatArgs(args: unknown[]): string {
    return args
        .map(arg => {
            if (typeof arg === 'string') return redact(arg)
            if (arg instanceof Error) return redact(arg.message)
            try {
                return redact(JSON.stringify(arg))
            } catch {
                return String(arg)
            }
        })
        .join(' ')
}

export const logger = {
    info(...args: unknown[]) {
        console.log(`[INFO] ${formatArgs(args)}`)
    },
    warn(...args: unknown[]) {
        console.warn(`[WARN] ${formatArgs(args)}`)
    },
    error(...args: unknown[]) {
        console.error(`[ERROR] ${formatArgs(args)}`)
    },
    debug(...args: unknown[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] ${formatArgs(args)}`)
        }
    },
}
