import nodemailer from 'nodemailer'

/**
 * إرسال بريد إلكتروني عبر حساب Gmail المُرسِل.
 * يقرأ بيانات الاعتماد من متغيرات البيئة:
 *   - GMAIL_USER: البريد المُرسِل (مثل 98906933n@gmail.com)
 *   - GMAIL_APP_PASSWORD: كلمة مرور التطبيق (16 حرف من Google)
 *
 * ملاحظات أمنية:
 *   - لا تُكتب بيانات الاعتماد في الكود المصدري إطلاقاً
 *   - كلمة المرور تُخزَّن في متغيرات بيئة Vercel فقط
 *   - كل عملية إرسال تُسجَّل في سجل الخادم
 */

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('GMAIL_USER و GMAIL_APP_PASSWORD يجب ضبطهما في متغيرات البيئة')
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  }, {
    from: `"${process.env.GMAIL_FROM_NAME || 'الوان الخليج - نظام الديكور'}" <${user}>`,
  })

  return cachedTransporter
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME || 'الوان الخليج - نظام الديكور'}" <${process.env.GMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html: opts.html,
    })

    console.log(`[EMAIL] Sent: to=${opts.to} messageId=${info.messageId} subject="${opts.subject}"`)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error(`[EMAIL] Failed: to=${opts.to} subject="${opts.subject}" error=${error?.message}`)
    return { success: false, error: error?.message || 'فشل في إرسال البريد' }
  }
}

/**
 * قالب بريد إلكتروني احترافي لإرسال كلمة المرور.
 */
export function buildPasswordEmail(args: { userName: string; password: string; appName?: string }): string {
  const appName = args.appName || 'نظام إدارة تصنيع ديكور الأعراس'
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>استعادة كلمة المرور</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Tahoma', sans-serif;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(180, 83, 9, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header .subtitle { margin-top: 8px; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; color: #78350f; margin-bottom: 16px; font-weight: 600; }
    .body-text { font-size: 15px; color: #451a03; line-height: 1.7; margin-bottom: 24px; }
    .password-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px dashed #d97706;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .password-label { font-size: 13px; color: #92400e; margin-bottom: 8px; font-weight: 600; }
    .password-value {
      font-family: 'Courier New', monospace;
      font-size: 28px;
      font-weight: 700;
      color: #78350f;
      letter-spacing: 4px;
      direction: ltr;
      display: inline-block;
      padding: 8px 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #fbbf24;
    }
    .warning {
      background: #fef2f2;
      border-right: 4px solid #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 13px;
      color: #991b1b;
      line-height: 1.6;
    }
    .warning strong { color: #7f1d1d; }
    .footer {
      background: #fef3c7;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #78350f;
      border-top: 1px solid #fde68a;
    }
    .footer a { color: #b45309; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 استعادة كلمة المرور</h1>
      <div class="subtitle">${appName}</div>
    </div>
    <div class="content">
      <div class="greeting">مرحباً ${args.userName}،</div>
      <div class="body-text">
        تم استلام طلب لاستعادة كلمة المرور الخاصة بحسابك في نظامنا. نُرفق لك كلمة المرور الحالية:
      </div>
      <div class="password-box">
        <div class="password-label">كلمة المرور الخاصة بك</div>
        <div class="password-value">${args.password}</div>
      </div>
      <div class="warning">
        <strong>⚠️ تنبيه أمني:</strong>
        <ul style="margin: 8px 0 0 0; padding-right: 18px;">
          <li>احرص على عدم مشاركة كلمة المرور مع أي شخص.</li>
          <li>بعد تسجيل الدخول، ننصح بتغيير كلمة المرور من صفحة الملف الشخصي.</li>
          <li>إذا لم تكن أنت من طلب الاستعادة، يرجى إبلاغ الإدارة فوراً.</li>
        </ul>
      </div>
      <div class="body-text" style="margin-top: 24px;">
        يمكنك تسجيل الدخول الآن من خلال الرابط:
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://my-project-tau-hazel.vercel.app'}" style="color: #d97706; font-weight: 600;">الدخول إلى النظام</a>
      </div>
    </div>
    <div class="footer">
      <div>© ${year} الوان الخليج - جميع الحقوق محفوظة</div>
      <div style="margin-top: 6px;">هذه الرسالة تلقائية، يرجى عدم الرد عليها.</div>
    </div>
  </div>
</body>
</html>`
}
