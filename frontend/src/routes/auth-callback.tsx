import * as React from 'react'
import { Command } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'

export function AuthCallbackRoute() {
  React.useEffect(() => {
    const search = window.location.search
    // Hand over the Google OAuth authorization code & state to the Go backend callback
    window.location.replace(`${API_BASE_URL}/auth/callback${search}`)
  }, [])

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground animate-pulse shadow-sm">
          <Command className="size-5" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Completing sign in with identity provider...
        </p>
      </div>
    </div>
  )
}
