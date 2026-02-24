// lib/api/response.ts
// Standardized API response helpers for Next.js route handlers
import { NextResponse } from 'next/server'

export class ApiResponse {
    static ok<T>(data: T, status = 200) {
        return NextResponse.json({ success: true, data }, { status })
    }

    static created<T>(data: T) {
        return NextResponse.json({ success: true, data }, { status: 201 })
    }

    static notFound(resource: string) {
        return NextResponse.json(
            { success: false, error: `${resource} not found` },
            { status: 404 }
        )
    }

    static forbidden(resource: string) {
        return NextResponse.json(
            { success: false, error: `Access denied to ${resource}` },
            { status: 403 }
        )
    }

    static unauthorized() {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        )
    }

    static validationError(errors: Record<string, string>) {
        return NextResponse.json(
            { success: false, error: 'Validation failed', details: errors },
            { status: 400 }
        )
    }

    static internalError(error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        console.error('[API Error]', error)
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }

    static rateLimited() {
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            { status: 429 }
        )
    }
}
