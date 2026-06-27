// استرجاع كلمات مرور جميع المستخدمين من قاعدة البيانات الإنتاجية
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()
const JWT_SECRET = 'wedding-decor-jwt-secret-2025-alwan-khaleej-secure-key-prod'
const PASSWORD_AES_KEY = crypto.createHash('sha256').update('aes-key:' + JWT_SECRET).digest('base64').slice(0, 32).padEnd(32, '0')

function decryptPassword(encrypted) {
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

const ROLE_LABELS = {
  general_manager: 'مدير عام',
  maintenance: 'صيانة',
  executive_manager: 'مسؤول تنفيذي',
  supervisor: 'مشرف',
  store_keeper: 'ستور كيبر',
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true, passwordEncrypted: true, updatedAt: true },
    orderBy: { createdAt: 'asc' }
  })

  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log('  كلمات مرور جميع المستخدمين - نظام إدارة تصنيع ديكور الأعراس')
  console.log('═══════════════════════════════════════════════════════════════════════════\n')

  const rows = users.map(u => {
    const plain = decryptPassword(u.passwordEncrypted)
    return {
      name: u.name,
      email: u.email,
      role: ROLE_LABELS[u.role] || u.role,
      status: u.status,
      password: plain || '— (غير متوفرة - يجب على المستخدم تسجيل الدخول مرة واحدة، أو إعادة تعيينها)',
      updatedAt: u.updatedAt.toISOString().slice(0, 16).replace('T', ' '),
    }
  })

  // Print as table
  const nameW = Math.max(...rows.map(r => r.name.length), 4)
  const emailW = Math.max(...rows.map(r => r.email.length), 5)
  const roleW = Math.max(...rows.map(r => r.role.length), 4)
  const pwdW = Math.max(...rows.map(r => r.password.length), 8)

  const fmt = (r) => `| ${r.name.padEnd(nameW)} | ${r.email.padEnd(emailW)} | ${r.role.padEnd(roleW)} | ${r.password.padEnd(pwdW)} |`

  const sep = `+${'-'.repeat(nameW+2)}+${'-'.repeat(emailW+2)}+${'-'.repeat(roleW+2)}+${'-'.repeat(pwdW+2)}+`
  console.log(sep)
  console.log(`| ${'الاسم'.padEnd(nameW)} | ${'البريد الإلكتروني'.padEnd(emailW)} | ${'الدور'.padEnd(roleW)} | ${'كلمة المرور'.padEnd(pwdW)} |`)
  console.log(sep)
  for (const r of rows) {
    console.log(fmt(r))
  }
  console.log(sep)

  console.log('\nملاحظات:')
  console.log('  - كلمات المرور مشفّرة بـ AES-256 (قابلة للعكس) في قاعدة البيانات.')
  console.log('  - كلمات مرور الحسابات الإدارية (مدير عام / صيانة) غير متوفرة في حقل العرض')
  console.log('    لأن الـ API يمنع تخزينها كنسخة قابلة للعكس لأسباب أمنية.')
  console.log('  - كلمات المرور الأخرى متوفرة لأن المستخدم سجّل الدخول مرة واحدة على الأقل')
  console.log('    بعد تفعيل الميزة، أو تم إعادة تعيينها من حساب الصيانة.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
