import * as React from 'react'
import { Command } from 'lucide-react'
import { useAuth } from '@/features/auth/use-auth'

export function RootIndexRoute() {
  const { isAuthenticated, isPending } = useAuth()

  React.useEffect(() => {
    if (!isPending) {
      if (isAuthenticated) {
        window.location.replace('/dashboard')
      } else {
        window.location.replace('/login')
      }
    }
  }, [isPending, isAuthenticated])

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground animate-pulse shadow-sm">
          <Command className="size-5" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading CloudPilot...
        </p>
      </div>
    </div>
  )
}
