import * as React from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Command } from 'lucide-react'
import { useAuth } from '@/features/auth/use-auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isPending } = useAuth()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  React.useEffect(() => {
    if (!isPending && !isAuthenticated) {
      window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`)
    }
  }, [isPending, isAuthenticated, currentPath])

  if (isPending || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground animate-pulse shadow-sm">
            <Command className="size-5" />
          </div>
          <p className="text-xs text-muted-foreground font-medium animate-pulse">
            Verifying workspace credentials...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
