'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Globe, LogIn, UserPlus } from 'lucide-react'

type Language = 'ar' | 'en'
type AuthMode = 'login' | 'register'

const translations = {
  ar: {
    login_title: 'تسجيل الدخول',
    login_desc: 'أدخل بياناتك للوصول إلى حسابك',
    register_title: 'إنشاء حساب جديد',
    register_desc: 'أنشئ حساباً جديداً للوصول إلى النظام',
    name: 'الاسم الكامل',
    name_placeholder: 'أدخل اسمك الكامل',
    email: 'البريد الإلكتروني',
    email_placeholder: 'example@email.com',
    phone: 'رقم الهاتف',
    phone_placeholder: '05xxxxxxxx',
    password: 'كلمة المرور',
    password_placeholder: 'أدخل كلمة المرور',
    confirm_password: 'تأكيد كلمة المرور',
    confirm_password_placeholder: 'أعد إدخال كلمة المرور',
    login_btn: 'تسجيل الدخول',
    register_btn: 'إنشاء حساب',
    no_account: 'ليس لديك حساب؟',
    has_account: 'لديك حساب بالفعل؟',
    create_account: 'إنشاء حساب جديد',
    login_here: 'تسجيل الدخول',
    show_password: 'إظهار كلمة المرور',
    hide_password: 'إخفاء كلمة المرور',
    forgot_password: 'نسيت كلمة المرور؟',
    password_min: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    passwords_not_match: 'كلمات المرور غير متطابقة',
    name_required: 'الاسم مطلوب',
    email_required: 'البريد الإلكتروني مطلوب',
    password_required: 'كلمة المرور مطلوبة',
    email_invalid: 'صيغة البريد الإلكتروني غير صحيحة',
    login_success: 'تم تسجيل الدخول بنجاح',
    register_success: 'تم إنشاء الحساب بنجاح',
    loading: 'جاري التحميل...',
    app_title: 'الوان الخليج',
    app_subtitle: 'نظام إدارة تصنيع ديكور الأعراس',
    incorrect_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    server_error: 'خطأ في الاتصال بالخادم',
  },
  en: {
    login_title: 'Login',
    login_desc: 'Enter your credentials to access your account',
    register_title: 'Create Account',
    register_desc: 'Create a new account to access the system',
    name: 'Full Name',
    name_placeholder: 'Enter your full name',
    email: 'Email',
    email_placeholder: 'example@email.com',
    phone: 'Phone',
    phone_placeholder: '05xxxxxxxx',
    password: 'Password',
    password_placeholder: 'Enter your password',
    confirm_password: 'Confirm Password',
    confirm_password_placeholder: 'Re-enter your password',
    login_btn: 'Login',
    register_btn: 'Create Account',
    no_account: "Don't have an account?",
    has_account: 'Already have an account?',
    create_account: 'Create new account',
    login_here: 'Login here',
    show_password: 'Show password',
    hide_password: 'Hide password',
    forgot_password: 'Forgot password?',
    password_min: 'Password must be at least 6 characters',
    passwords_not_match: 'Passwords do not match',
    name_required: 'Name is required',
    email_required: 'Email is required',
    password_required: 'Password is required',
    email_invalid: 'Invalid email format',
    login_success: 'Login successful',
    register_success: 'Account created successfully',
    loading: 'Loading...',
    app_title: 'Alwan Al Khaleej',
    app_subtitle: 'Wedding Decor Management System',
    incorrect_credentials: 'Incorrect email or password',
    server_error: 'Server connection error',
  }
}

export default function AuthPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('ar')
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const t = translations[language]
  const isRTL = language === 'ar'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errorMessage) setErrorMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    // Basic validation
    if (!formData.email.trim()) {
      setErrorMessage(t.email_required)
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage(t.email_invalid)
      return
    }
    if (!formData.password.trim()) {
      setErrorMessage(t.password_required)
      return
    }

    // Registration-specific validation
    if (mode === 'register') {
      if (formData.password.length < 6) {
        setErrorMessage(t.password_min)
        return
      }
      if (!formData.name.trim()) {
        setErrorMessage(t.name_required)
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage(t.passwords_not_match)
        return
      }
    }

    setIsLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, phone: formData.phone, password: formData.password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage(mode === 'login' ? t.login_success : t.register_success)
        // Use router.push for reliable client-side navigation
        router.push('/')
      } else {
        setErrorMessage(data.error || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
      }
    } catch {
      setErrorMessage(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setFormData({ name: '', email: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setShowConfirmPassword(false)
    setErrorMessage('')
    setSuccessMessage('')
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

        {/* Error message - shown prominently */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-center font-medium text-sm">
            {errorMessage}
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-center font-medium text-sm">
            {successMessage}
          </div>
        )}

        {/* Auth card */}
        <Card className="border-amber-200 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
              {mode === 'login' ? (
                <LogIn className="w-7 h-7 text-white" />
              ) : (
                <UserPlus className="w-7 h-7 text-white" />
              )}
            </div>
            <CardTitle className="text-xl text-amber-900">
              {mode === 'login' ? t.login_title : t.register_title}
            </CardTitle>
            <CardDescription>
              {mode === 'login' ? t.login_desc : t.register_desc}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field (register only) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-amber-900 font-medium">
                    {t.name} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t.name_placeholder}
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                    autoComplete="name"
                  />
                </div>
              )}

              {/* Phone field (register only) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-amber-900 font-medium">
                    {t.phone}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t.phone_placeholder}
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-900 font-medium">
                  {t.email} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.email_placeholder}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                  autoComplete="email"
                  dir="ltr"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-amber-900 font-medium">
                  {t.password} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.password_placeholder}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="border-amber-200 focus:border-amber-500 focus:ring-amber-500 pr-10"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-800"
                    style={isRTL ? { left: '10px' } : { right: '10px' }}
                    title={showPassword ? t.hide_password : t.show_password}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="text-xs text-amber-600">{t.password_min}</p>
                )}
              </div>

              {/* Confirm Password field (register only) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-amber-900 font-medium">
                    {t.confirm_password} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t.confirm_password_placeholder}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className="border-amber-200 focus:border-amber-500 focus:ring-amber-500 pr-10"
                      autoComplete="new-password"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-800"
                      style={isRTL ? { left: '10px' } : { right: '10px' }}
                      title={showConfirmPassword ? t.hide_password : t.show_password}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot password (login only) */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-amber-600 hover:text-amber-800 hover:underline"
                    onClick={() => setErrorMessage(language === 'ar' ? 'ميزة استعادة كلمة المرور قادمة قريباً' : 'Password recovery coming soon')}
                  >
                    {t.forgot_password}
                  </button>
                </div>
              )}

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
                    {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {mode === 'login' ? t.login_btn : t.register_btn}
                  </span>
                )}
              </Button>
            </form>

            {/* Switch mode */}
            <div className="mt-6 text-center text-sm text-amber-700">
              {mode === 'login' ? (
                <span>
                  {t.no_account}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="font-semibold text-amber-600 hover:text-amber-800 hover:underline"
                  >
                    {t.create_account}
                  </button>
                </span>
              ) : (
                <span>
                  {t.has_account}{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="font-semibold text-amber-600 hover:text-amber-800 hover:underline"
                  >
                    {t.login_here}
                  </button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-amber-600 mt-4">
          {language === 'ar' ? 'الوان الخليج © 2025 - جميع الحقوق محفوظة' : 'Alwan Al Khaleej © 2025 - All rights reserved'}
        </p>
      </div>
    </div>
  )
}
