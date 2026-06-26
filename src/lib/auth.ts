import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const SALT_ROUNDS = 12
const TOKEN_NAME = 'auth_token'
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

// مفتاح تشفير AES-256 لكلمات المرور القابلة للعكس (للصيانة فقط)
// 32 بايت = 256 بت. إذا لم يُضبط في البيئة، نُولّد مفتاحاً ثابتاً من JWT_SECRET.
const PASSWORD_AES_KEY = process.env.PASSWORD_AES_KEY
  || crypto.createHash('sha256').update('aes-key:' + JWT_SECRET).digest('base64').slice(0, 32).padEnd(32, '0')

// Hash a password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify a password against a hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * تشفير كلمة المرور بـ AES-256-CTR قابل للعكس.
 * يستعمل فقط لتخزين نسخة يقدر الصيانة/المدير العام على فك تشفيرها وعرضها.
 * الصيغة: base64(iv || ciphertext)
 */
export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(PASSWORD_AES_KEY, 'utf8'), iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('base64')
}

/**
 * فك تشفير كلمة المرور المخزّنة بصيغة AES-256-CTR.
 * يرجع null إذا لم يكن هناك نسخة مخزّنة (مثلاً للمستخدمين القدامى قبل تفعيل الميزة).
 */
export function decryptPassword(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    const buf = Buffer.from(encrypted, 'base64')
    const iv = buf.subarray(0, 16)
    const data = buf.subarray(16)
    const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(PASSWORD_AES_KEY, 'utf8'), iv)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

// Generate a JWT token
export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// Verify and decode a JWT token
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }
  } catch {
    return null
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_EXPIRY / 1000, // maxAge is in seconds
  })
}

// Get current user from cookie
export async function getCurrentUser(): Promise<{ userId: string; email: string; role: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Clear auth cookie (logout)
export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_NAME)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength (minimum 6 characters)
export function isValidPassword(password: string): boolean {
  return password.length >= 6
}

// Safe error response - hides internal errors like Prisma details
export function safeErrorResponse(error: unknown, defaultMessage: string): { error: string } {
  // In production, never expose internal error details
  if (process.env.NODE_ENV === 'production') {
    return { error: defaultMessage }
  }
  
  // In development, log the error but still return a safe message
  console.error('Internal error:', error)
  return { error: defaultMessage }
}

// Check if role has full admin permissions (general_manager OR maintenance)
// Both roles have identical full permissions across the entire app
export function isFullAdmin(role: string): boolean {
  return role === 'general_manager' || role === 'maintenance'
}
