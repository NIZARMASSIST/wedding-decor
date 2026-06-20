import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'
const SALT_ROUNDS = 12
const TOKEN_NAME = 'auth_token'
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

// Hash a password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify a password against a hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
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
