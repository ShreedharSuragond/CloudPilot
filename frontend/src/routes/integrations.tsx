import * as React from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  Workflow,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useIntegrationsQuery,
  type Integration,
} from '@/features/settings/integrations.queries'
import {
  useDeleteIntegrationMutation,
  useToggleIntegrationMutation,
  useTestIntegrationMutation,
} from '@/features/settings/integrations.mutations'
import { CreateIntegrationModal } from '@/features/settings/create-integration-modal'
import { cn } from '@/lib/utils'

export function IntegrationsRoute() {
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [testResult, setTestResult] = React.useState<{ id: string; success: boolean; message: string } | null>(null)

  const { data: integrations, isPending, refetch, isRefetching } = useIntegrationsQuery()

  const deleteMutation = useDeleteIntegrationMutation()
  const toggleMutation = useToggleIntegrationMutation()
  const testMutation = useTestIntegrationMutation()

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (integration: Integration) => {
    if (confirm(`Are you sure you want to delete webhook integration "${integration.name}"?`)) {
      deleteMutation.mutate(integration.id)
    }
  }

  const handleToggle = (integration: Integration) => {
    toggleMutation.mutate(integration.id)
  }

  const handleTest = (integration: Integration) => {
    testMutation.mutate(integration.id, {
      onSuccess: (data) => {
        setTestResult({
          id: integration.id,
          success: data.success,
          message: data.message,
        })
        setTimeout(() => setTestResult(null), 5000)
      },
    })
  }

  const getProviderBadge = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'slack':
        return <Badge className="bg-[#4A154B] text-white hover:bg-[#4A154B]/90 text-[10px]">Slack</Badge>
      case 'teams':
        return <Badge className="bg-[#464EB8] text-white hover:bg-[#464EB8]/90 text-[10px]">MS Teams</Badge>
      case 'discord':
        return <Badge className="bg-[#5865F2] text-white hover:bg-[#5865F2]/90 text-[10px]">Discord</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">Webhook</Badge>
    }
  }

  const activeCount = integrations?.filter((i) => i.enabled).length ?? 0
  const healthyCount = integrations?.filter((i) => i.lastStatus === 'success').length ?? 0

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Integrations' }]}>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Workflow className="size-5 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Alert & Notification Integrations
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect Slack, Microsoft Teams, Discord, or custom webhooks for real-time security alerts and FinOps cost spikes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => refetch()}
                disabled={isRefetching || isPending}
              >
                <RefreshCw className={cn('size-3.5', isRefetching && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="size-4" />
                Add Webhook
              </Button>
            </div>
          </div>

          {/* Test Notification Banner if active */}
          {testResult && (
            <div
              className={cn(
                'flex items-center justify-between p-3.5 rounded-lg border text-xs transition-all animate-in fade-in',
                testResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              )}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="size-4 text-rose-500" />
                )}
                <span>{testResult.message}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setTestResult(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Configured Integrations
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Workflow className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    {integrations?.length ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeCount} currently active & receiving events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Delivery Health
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight text-emerald-400">
                    {integrations && integrations.length > 0
                      ? `${Math.round((healthyCount / Math.max(integrations.length, 1)) * 100)}%`
                      : '100%'}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Successful webhook delivery rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Monitored Event Topics
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Bell className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  4 Topics
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Critical findings, cost spikes, AI drift, sync errors
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Integrations Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Active Webhook Channels</CardTitle>
                  <CardDescription className="text-xs">
                    Automated event dispatch pipeline triggered when policies fail or cost anomalies occur.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] gap-1">
                  <Activity className="size-3 text-emerald-500" />
                  Real-time Dispatch
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : !integrations || integrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Workflow className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">No Integrations Configured</h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Connect your team's Slack, Microsoft Teams, or Discord channels to receive instant notifications for cloud risks.
                    </p>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="size-4" /> Add Your First Webhook
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Subscribed Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getProviderBadge(item.provider)}
                              <span className="font-semibold text-xs text-foreground">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              ID: {item.id}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                            <span>{item.webhookUrl}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.webhookUrl, item.id)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Copy endpoint"
                            >
                              {copiedId === item.id ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.events.map((ev) => (
                              <span
                                key={ev}
                                className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50"
                              >
                                {ev.includes('critical') && <ShieldAlert className="size-2.5 text-rose-500" />}
                                {ev.includes('anomaly') && <DollarSign className="size-2.5 text-amber-500" />}
                                {ev}
                              </span>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggle(item)}
                            disabled={toggleMutation.isPending && toggleMutation.variables === item.id}
                            className="cursor-pointer"
                            title="Click to toggle active status"
                          >
                            <Badge
                              variant={item.enabled ? 'default' : 'secondary'}
                              className={cn(
                                'text-[10px] font-medium transition-all',
                                item.enabled
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              )}
                            >
                              {item.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </button>
                        </TableCell>

                        <TableCell className="text-xs">
                          {item.lastTriggeredAt ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-[11px] text-foreground">
                                {new Date(item.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex items-center gap-1 text-[10px]">
                                <span
                                  className={cn(
                                    'size-1.5 rounded-full',
                                    item.lastStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                                  )}
                                />
                                <span className={item.lastStatus === 'success' ? 'text-emerald-500' : 'text-rose-500'}>
                                  {item.lastStatus}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Never fired</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                              disabled={testMutation.isPending && testMutation.variables === item.id}
                              onClick={() => handleTest(item)}
                            >
                              {testMutation.isPending && testMutation.variables === item.id ? (
                                <RefreshCw className="size-3 animate-spin" />
                              ) : (
                                <Send className="size-3" />
                              )}
                              Test Ping
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              disabled={deleteMutation.isPending && deleteMutation.variables === item.id}
                              onClick={() => handleDelete(item)}
                              title="Delete integration"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Event Topic Documentation Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Available Alert Trigger Topics</CardTitle>
              <CardDescription className="text-xs">
                Payloads dispatched to these webhooks match CloudPilot's standardized JSON alert format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ShieldAlert className="size-3.5 text-rose-500" />
                    <code>policy.critical</code> & <code>policy.high</code>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Dispatched immediately when the continuous policy scanner flags open critical or high security violations (e.g. S3 public buckets, unencrypted endpoints).
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <DollarSign className="size-3.5 text-amber-500" />
                    <code>cost.anomaly</code> & <code>account.sync</code>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Dispatched when FinOps daily telemetry detects cost spikes over 20% or when cloud account IAM discovery credentials fail.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Webhook Modal */}
          <CreateIntegrationModal
            open={createModalOpen}
            onOpenChange={setCreateModalOpen}
          />
        </div>
      </AppShell>
    </AuthGuard>
  )
}
