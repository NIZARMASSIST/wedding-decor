'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="max-w-md w-full border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <CardTitle className="text-red-800">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 text-sm">
            An error occurred while loading this page. This might be a temporary issue.
          </p>
          {error?.message && (
            <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded font-mono break-all">
              {error.message}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} className="bg-amber-500 hover:bg-amber-600">
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
