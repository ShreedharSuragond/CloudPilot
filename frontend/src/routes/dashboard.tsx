import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Boxes,
  BrainCircuit,
  CircleDollarSign,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthGuard } from '@/components/auth/auth-guard'
import { cn } from '@/lib/utils'
import {
  useCloudAccountsQuery,
  useDashboardSummaryQuery,
} from '@/features/dashboard/dashboard.queries'
import { useSyncAccountMutation } from '@/features/dashboard/dashboard.mutations'
import { ConnectAccountModal } from '@/features/dashboard/connect-account-modal'
import { CopilotDialog } from '@/features/dashboard/copilot-dialog'
import { CopilotInsightsCard } from '@/features/dashboard/copilot-insights-card'
import { SpendBreakdownCard } from '@/features/dashboard/spend-chart'
import { FindingsTable } from '@/features/dashboard/findings-table'

export function DashboardRoute() {
  const { data: summary, isPending: isSummaryPending } = useDashboardSummaryQuery()
  const { data: accounts, isPending: isAccountsPending } = useCloudAccountsQuery()
  const syncAccountMutation = useSyncAccountMutation()

  const [connectModalOpen, setConnectModalOpen] = React.useState(false)
  const [copilotOpen, setCopilotOpen] = React.useState(false)
  const [copilotInitialQuery, setCopilotInitialQuery] = React.useState<string | undefined>()

  const handleAskCopilot = (question: string) => {
    setCopilotInitialQuery(question)
    setCopilotOpen(true)
  }

  const handleSyncAccount = (accountId: string) => {
    syncAccountMutation.mutate(accountId)
  }

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Overview' }]}>
        {/* Header Section */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  Multi-Cloud & AI Observability
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Your cloud, in focus.
              </h1>
              <p className="text-sm text-muted-foreground">
                Autonomous governance for multi-cloud infrastructure, foundation models, and FinOps telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConnectModalOpen(true)}
              >
                <Plus className="size-3.5" /> Connect Account
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                onClick={() => handleAskCopilot('Synthesize our multi-cloud security and AI cost status.')}
              >
                <Sparkles className="size-3.5" /> Ask AI Copilot
              </Button>
            </div>
          </section>

          {/* 4 Dynamic Metric KPI Cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key cloud metrics">
            {/* Total Resources */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Cloud Resources
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                  <Boxes className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    {summary?.totalResources ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Across {summary?.connectedAccounts ?? 0} connected cloud accounts
                </p>
              </CardContent>
            </Card>

            {/* Monthly Cloud Spend */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Monthly Cloud Run Rate
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                  <CircleDollarSign className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    ${summary?.monthlySpend?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Normalized AWS & GCP billing telemetry
                </p>
              </CardContent>
            </Card>

            {/* AI Workloads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Active AI Workloads
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <BrainCircuit className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    {summary?.activeAiWorkloads ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Bedrock Claude, Vertex AI & SageMaker
                </p>
              </CardContent>
            </Card>

            {/* Compliance Score */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Compliance Posture
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  {summary && summary.criticalFindingsCount > 0 ? (
                    <ShieldAlert className="size-4 text-amber-600" />
                  ) : (
                    <ShieldCheck className="size-4 text-emerald-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
                    <span>{summary?.complianceScore ?? 100}%</span>
                    {summary && summary.criticalFindingsCount > 0 && (
                      <span className="text-xs font-medium text-amber-600">
                        ({summary.criticalFindingsCount} critical)
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Continuous security baseline evaluation
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Main Grid: Copilot & Findings (Left) + Spend & Accounts (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Copilot Insights + Security Findings */}
            <div className="lg:col-span-2 space-y-6">
              <CopilotInsightsCard onAskCopilot={handleAskCopilot} />
              <FindingsTable onAskCopilot={handleAskCopilot} />
            </div>

            {/* Right 1 Col: Spend Breakdown + Connected Accounts */}
            <div className="space-y-6">
              <SpendBreakdownCard />

              {/* Connected Cloud Accounts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-semibold">Connected Accounts</CardTitle>
                    <p className="text-xs text-muted-foreground">Synchronized cloud environments</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs gap-1"
                    onClick={() => setConnectModalOpen(true)}
                  >
                    <Plus className="size-3.5" /> Add
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3 pt-2">
                  {isAccountsPending ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : !accounts || accounts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No cloud accounts connected yet.
                    </div>
                  ) : (
                    accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{acc.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {acc.provider}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-mono">ID: {acc.accountIdentifier}</span>
                            {acc.lastSyncAt && (
                              <>
                                <span>•</span>
                                <span>
                                  Synced {new Date(acc.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] capitalize font-medium',
                              acc.status === 'connected' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400',
                              acc.status === 'syncing' && 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-400',
                              (acc.status === 'error' || acc.status === 'degraded') && 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400'
                            )}
                          >
                            {acc.status === 'syncing' && <RefreshCw className="mr-1 size-2.5 animate-spin" />}
                            {acc.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Synchronize Assets"
                            disabled={syncAccountMutation.isPending && syncAccountMutation.variables === acc.id}
                            onClick={() => handleSyncAccount(acc.id)}
                          >
                            <RefreshCw
                              className={`size-3 text-muted-foreground ${
                                syncAccountMutation.isPending && syncAccountMutation.variables === acc.id
                                  ? 'animate-spin text-primary'
                                  : ''
                              }`}
                            />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
                      <Link to="/inventory">
                        <Boxes className="size-3.5" /> View Full Inventory <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Connect Account Modal */}
          <ConnectAccountModal
            open={connectModalOpen}
            onOpenChange={setConnectModalOpen}
          />

          {/* Copilot Dialog */}
          <CopilotDialog
            open={copilotOpen}
            onOpenChange={setCopilotOpen}
            initialQuestion={copilotInitialQuery}
          />

          {/* Footer */}
          <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              CloudPilot Autonomous Governance & AI Observability
            </span>
            <span>v0.2.0 • Multi-Cloud Active</span>
          </footer>
      </AppShell>
    </AuthGuard>
  )
}
