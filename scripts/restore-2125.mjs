// Restore أجيش's password to "2125" directly via Prisma + bcrypt (bypassing the 6-char validation)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()
const JWT_SECRET = 'wedding-decor-jwt-secret-2025-alwan-khaleej-secure-key-prod'
const PASSWORD_AES_KEY = crypto.createHash('sha256').update('aes-key:' + JWT_SECRET).digest('base64').slice(0, 32).padEnd(32, '0')

function encryptPassword(password) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(PASSWORD_AES_KEY, 'utf8'), iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return Buffer.concat([iv, encrypted]).toString('base64')
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'yahya@gmail.com' } })
  if (!user) { console.log('user not found'); return }
  console.log('before:', { id: user.id, name: user.name, email: user.email, hasPwd: !!user.password, hasEnc: !!user.passwordEncrypted })

  const password = '2125'
  const hashedPassword = await bcrypt.hash(password, 12)
  const encryptedPassword = encryptPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordEncrypted: encryptedPassword }
  })

  const updated = await prisma.user.findUnique({ where: { id: user.id } })
  console.log('after: password restored to "2125", hasPwd:', !!updated.password, 'hasEnc:', !!updated.passwordEncrypted)

  // Verify
  const ok = await bcrypt.compare('2125', updated.password)
  console.log('verify login with "2125":', ok ? 'OK' : 'FAIL')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
