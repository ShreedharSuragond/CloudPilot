import * as React from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Command, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { useAuthConfigQuery } from '@/features/auth/auth.queries'
import { useAuth } from '@/features/auth/use-auth'
import { API_BASE_URL } from '@/lib/api'

export function LoginRoute() {
  const config = useAuthConfigQuery()
  const { isAuthenticated, isPending: isAuthPending } = useAuth()
  const routerState = useRouterState()

  // Extract redirect query parameter from router location
  const searchParams = new URLSearchParams(routerState.location.searchStr)
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  // If already authenticated with real backend session, redirect immediately
  React.useEffect(() => {
    if (!isAuthPending && isAuthenticated) {
      window.location.replace(redirectTo)
    }
  }, [isAuthPending, isAuthenticated, redirectTo])

  // While verifying existing session on tab open, show clean verification screen
  if (isAuthPending || isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground animate-pulse shadow-sm">
            <Command className="size-5" />
          </div>
          <p className="text-xs text-muted-foreground font-medium animate-pulse">
            {isAuthenticated ? 'Redirecting to workspace...' : 'Verifying workspace credentials...'}
          </p>
        </div>
      </div>
    )
  }

  function startLogin() {
    const returnUrl = redirectTo.startsWith('http') ? redirectTo : `${window.location.origin}${redirectTo}`
    window.location.assign(`${API_BASE_URL}/auth/login?redirect=${encodeURIComponent(returnUrl)}`)
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-4 sm:p-6">
      <Card className="w-full sm:max-w-md shadow-lg border-border">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2.5 pt-2">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Command className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">cloudpilot</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
              Unified Access
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome to CloudPilot
            </h1>
            <p className="text-xs text-muted-foreground">
              Sign in or get started with your organisation's identity provider.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {config.isPending ? (
            <Button className="w-full" disabled>
              Checking identity provider...
            </Button>
          ) : config.data?.enabled ? (
            <Button className="w-full" size="lg" type="button" onClick={startLogin}>
              Continue with Identity Provider
            </Button>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold">OIDC Provider Unconfigured</p>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  Set `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, and `OIDC_CALLBACK_URL` in `.env` for federated SSO.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center text-center text-[11px] text-muted-foreground border-t border-border pt-4">
          <span>New accounts automatically receive a dedicated, isolated workspace.</span>
        </CardFooter>
      </Card>
    </main>
  )
}
