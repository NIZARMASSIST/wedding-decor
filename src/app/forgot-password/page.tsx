'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Mail, ArrowRight, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'

type Language = 'ar' | 'en'

const translations = {
  ar: {
    title: 'نسيت كلمة المرور؟',
    desc: 'أدخل بريدك الإلكتروني وسنرسل لك كلمة المرور الحالية',
    email: 'البريد الإلكتروني',
    email_placeholder: 'example@email.com',
    submit: 'إرسال كلمة المرور',
    back_to_login: 'العودة لتسجيل الدخول',
    loading: 'جاري الإرسال...',
    email_required: 'البريد الإلكتروني مطلوب',
    email_invalid: 'صيغة البريد الإلكتروني غير صحيحة',
    success_title: 'تم إرسال البريد',
    success_desc: 'إذا كان البريد الإلكتروني مسجّلاً لدينا، فقد أرسلنا إليك تعليمات استرجاع كلمة المرور. يرجى التحقق من بريدك الوارد ومجلد الرسائل غير المرغوب فيها.',
    error_title: 'حدث خطأ',
    app_title: 'الوان الخليج',
    app_subtitle: 'نظام إدارة تصنيع ديكور الأعراس',
    note: 'لأسباب أمنية، نرسل نفس الرسالة بغض النظر عن وجود البريد لمنع التخمين.',
    rate_note: 'الحد الأقصى: 3 طلبات في الساعة لكل بريد إلكتروني.',
    footer: 'الوان الخليج © 2025 - جميع الحقوق محفوظة',
  },
  en: {
    title: 'Forgot Password?',
    desc: 'Enter your email and we will send you your current password',
    email: 'Email',
    email_placeholder: 'example@email.com',
    submit: 'Send Password',
    back_to_login: 'Back to Login',
    loading: 'Sending...',
    email_required: 'Email is required',
    email_invalid: 'Invalid email format',
    success_title: 'Email Sent',
    success_desc: 'If the email is registered with us, we have sent you password recovery instructions. Please check your inbox and spam folder.',
    error_title: 'Error',
    app_title: 'Alwan Al Khaleej',
    app_subtitle: 'Wedding Decor Management System',
    note: 'For security reasons, we send the same response regardless of whether the email exists, to prevent guessing.',
    rate_note: 'Limit: 3 requests per hour per email.',
    footer: 'Alwan Al Khaleej © 2025 - All rights reserved',
  }
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('ar')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const t = translations[language]
  const isRTL = language === 'ar'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    // Validation
    if (!email.trim()) {
      setErrorMessage(t.email_required)
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage(t.email_invalid)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage(data.message || t.success_desc)
        setEmail('') // Clear the field
      } else if (res.status === 429) {
        // Rate limit exceeded - show the message
        setErrorMessage(data.error || (language === 'ar' ? 'تم تجاوز الحد المسموح من المحاولات' : 'Rate limit exceeded'))
      } else {
        setErrorMessage(data.error || (language === 'ar' ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'An error occurred'))
      }
    } catch {
      setErrorMessage(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg border border-amber-200 p-1">
            <Button
              variant={language === 'ar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('ar')}
              className={`gap-1 text-xs ${language === 'ar' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              <Globe className="w-3 h-3" /> عربي
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('en')}
              className={`gap-1 text-xs ${language === 'en' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              <Globe className="w-3 h-3" /> EN
            </Button>
          </div>
        </div>

        {/* Logo and title */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-xl object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-amber-900">{t.app_title}</h1>
          <p className="text-amber-700 mt-1">{t.app_subtitle}</p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-center font-medium text-sm flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 text-center font-medium text-sm">
            <div className="flex items-center gap-2 justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-bold">{t.success_title}</span>
            </div>
            <p className="text-xs leading-relaxed">{successMessage}</p>
          </div>
        )}

        {/* Card */}
        <Card className="border-amber-200 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-xl text-amber-900">{t.title}</CardTitle>
            <CardDescription>{t.desc}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-900 font-medium">
                  {t.email} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.email_placeholder}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errorMessage) setErrorMessage('')
                    }}
                    className="border-amber-200 focus:border-amber-500 focus:ring-amber-500 pr-10"
                    autoComplete="email"
                    dir="ltr"
                    disabled={isLoading}
                  />
                  <Mail className="absolute top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4" style={isRTL ? { left: '10px' } : { right: '10px' }} />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium py-2.5 text-base"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {t.loading}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t.submit}
                  </span>
                )}
              </Button>

              {/* Security note */}
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 leading-relaxed">
                <p className="mb-1">🔒 {t.note}</p>
                <p>⏱️ {t.rate_note}</p>
              </div>
            </form>

            {/* Back to login */}
            <div className="mt-6 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push('/login')}
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <ArrowRight className="w-4 h-4" />
                {t.back_to_login}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-amber-600 mt-4">
          {t.footer}
        </p>
      </div>
    </div>
  )
}
