'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, Globe } from 'lucide-react'
import DesignCostCalculator from '@/components/DesignCostCalculator'

export default function DesignCostCalculatorPageClient() {
  const [language, setLanguage] = useState<'ar' | 'en'>('en')
  const [mounted, setMounted] = useState(false)

  // Restore language preference from localStorage
  useEffect(() => {
    setMounted(true)
    const saved =
      typeof window !== 'undefined'
        ? (localStorage.getItem('dcc-lang') as 'ar' | 'en' | null)
        : null
    if (saved === 'ar' || saved === 'en') {
      setLanguage(saved)
    } else {
      // Auto-detect from browser
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('ar')) setLanguage('ar')
    }
  }, [])

  // Sync <html> lang + dir attributes with current language
  useEffect(() => {
    if (typeof document === 'undefined') return
    const isAr = language === 'ar'
    document.documentElement.lang = language
    document.documentElement.dir = isAr ? 'rtl' : 'ltr'
  }, [language])

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar'
    setLanguage(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dcc-lang', next)
    }
  }

  const isAr = language === 'ar'

  // Avoid hydration mismatch — render a neutral shell on first paint
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50" />
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 antialiased"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <header className="sticky top-0 z-40 border-b border-amber-200/60 bg-white/80 backdrop-blur-md shadow-sm print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-amber-900 sm:text-lg">
                {isAr ? 'حاسبة تكلفة التصميم' : 'Design Cost Calculator'}
              </h1>
              <p className="hidden text-xs text-amber-700/70 sm:block">
                {isAr
                  ? 'أداة لتقدير تكلفة الملف الفني للمنتج'
                  : 'Technical File Cost Estimation Tool'}
              </p>
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            <Link href="/" passHref legacyBehavior>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              >
                <a>
                  {isAr ? (
                    <ArrowLeft className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isAr ? 'العودة للتطبيق' : 'Back to App'}
                  </span>
                  <span className="sm:hidden">
                    {isAr ? 'العودة' : 'Back'}
                  </span>
                </a>
              </Button>
            </Link>

            <Button
              onClick={toggleLanguage}
              variant="outline"
              size="sm"
              className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" />
              <span className="font-semibold">{isAr ? 'EN' : 'ع'}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <DesignCostCalculator language={language} />
      </main>

      <footer className="mt-8 border-t border-amber-200/60 bg-white/60 py-6 print:hidden">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-amber-700/70 sm:px-6 lg:px-8">
          <p>
            {isAr
              ? 'حاسبة تكلفة التصميم — أداة مستقلة لتقدير تكلفة الملف الفني للمنتج'
              : 'Design Cost Calculator — Standalone tool for technical file cost estimation'}
          </p>
          <p className="mt-1">
            {isAr ? '© 2026 جميع الحقوق محفوظة' : '© 2026 All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  )
}
