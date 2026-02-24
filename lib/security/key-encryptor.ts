// lib/security/key-encryptor.ts
// AES-256-GCM encryption for storing API keys at rest
// Used when organizations bring their own keys (BYOK)
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key || key.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 characters')
    }
    // Use first 32 bytes as the key
    return Buffer.from(key.slice(0, 32), 'utf-8')
}

/**
 * Encrypt a plaintext string.
 * Returns: base64 string of [IV (12) + encrypted + authTag (16)]
 */
export function encrypt(plaintext: string): string {
    const key = getKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    // Pack: IV + encrypted + authTag
    const packed = Buffer.concat([iv, encrypted, authTag])
    return packed.toString('base64')
}

/**
 * Decrypt a base64-encoded encrypted string.
 */
export function decrypt(encryptedBase64: string): string {
    const key = getKey()
    const packed = Buffer.from(encryptedBase64, 'base64')

    const iv = packed.subarray(0, IV_LENGTH)
    const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH)
    const encrypted = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ])

    return decrypted.toString('utf8')
}
