import * as React from 'react'
import {
  Building2,
  Check,
  Clock,
  Cloud,
  Copy,
  Cpu,
  History,
  Plus,
  RefreshCw,
  Settings2,
  Shield,
  Trash2,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  useCloudAccountsQuery,
  type CloudAccount,
} from '@/features/dashboard/dashboard.queries'
import { useSyncAccountMutation } from '@/features/dashboard/dashboard.mutations'
import { ConnectAccountModal } from '@/features/dashboard/connect-account-modal'
import {
  useAuditEventsQuery,
} from '@/features/settings/integrations.queries'
import {
  useDisconnectAccountMutation,
} from '@/features/settings/integrations.mutations'
import { useCurrentOrganisationQuery } from '@/features/organisations/organisation.queries'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function SettingsRoute() {
  const [activeTab, setActiveTab] = React.useState('connectors')
  const [connectModalOpen, setConnectModalOpen] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Audit metadata viewer
  const [selectedAuditMeta, setSelectedAuditMeta] = React.useState<Record<string, any> | null>(null)

  // Queries
  const { data: accounts, isPending: isAccountsPending, refetch: refetchAccounts } = useCloudAccountsQuery()
  const { data: currentOrg, isPending: isOrgPending } = useCurrentOrganisationQuery()
  const { data: auditEvents, isPending: isAuditPending, refetch: refetchAudit } = useAuditEventsQuery()

  // Mutations
  const syncMutation = useSyncAccountMutation()
  const disconnectMutation = useDisconnectAccountMutation()

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSyncAccount = (account: CloudAccount) => {
    syncMutation.mutate(account.id)
  }

  const handleDisconnect = (account: CloudAccount) => {
    if (confirm(`Are you sure you want to disconnect cloud account "${account.name}" (${account.provider.toUpperCase()})? All discovered assets and findings for this account will be removed.`)) {
      disconnectMutation.mutate(account.id)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'aws':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-mono text-[10px]">AWS</Badge>
      case 'gcp':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-mono text-[10px]">GCP</Badge>
      case 'azure':
        return <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20 font-mono text-[10px]">Azure</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{provider}</Badge>
    }
  }

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Settings' }]}>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings2 className="size-5 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Workspace & Cloud Settings
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage connected cloud environments, tenant workspace governance, and view compliance audit history.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'connectors' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => refetchAccounts()}>
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => setConnectModalOpen(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Connect Account
                  </Button>
                </>
              )}
              {activeTab === 'audit' && (
                <Button variant="outline" size="sm" onClick={() => refetchAudit()}>
                  <RefreshCw className="mr-1.5 size-3.5" />
                  Refresh Log
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="connectors" className="gap-2 text-xs">
                <Cloud className="size-4" />
                Cloud Connectors
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {accounts?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="workspace" className="gap-2 text-xs">
                <Building2 className="size-4" />
                Workspace Governance
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 text-xs">
                <History className="size-4" />
                Compliance Audit Trail
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {auditEvents?.length ?? 0}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Cloud Connectors */}
            <TabsContent value="connectors" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isAccountsPending ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)
                ) : accounts && accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <Card key={acc.id} className="relative overflow-hidden flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getProviderIcon(acc.provider)}
                            <CardTitle className="text-sm font-semibold truncate max-w-[140px]">
                              {acc.name}
                            </CardTitle>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-medium capitalize',
                              acc.status === 'connected' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
                              acc.status === 'syncing' && 'border-sky-500/20 bg-sky-500/10 text-sky-500',
                              acc.status === 'error' && 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                            )}
                          >
                            {acc.status === 'syncing' && <RefreshCw className="mr-1 size-2.5 animate-spin" />}
                            {acc.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs font-mono pt-1 text-muted-foreground truncate">
                          ID: {acc.accountIdentifier}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
                        {acc.roleArn && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">IAM Role ARN</span>
                            <div className="flex items-center gap-1 font-mono text-[11px] bg-muted/50 p-1.5 rounded truncate">
                              <span className="truncate">{acc.roleArn}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(acc.roleArn || '', `arn-${acc.id}`)}
                                className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                              >
                                {copiedId === `arn-${acc.id}` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {acc.externalId && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">External Trust ID</span>
                            <div className="flex items-center gap-1 font-mono text-[11px] bg-muted/50 p-1.5 rounded truncate">
                              <span className="truncate">{acc.externalId}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(acc.externalId || '', `ext-${acc.id}`)}
                                className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                              >
                                {copiedId === `ext-${acc.id}` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              disabled={syncMutation.isPending && syncMutation.variables === acc.id}
                              onClick={() => handleSyncAccount(acc)}
                            >
                              <RefreshCw
                                className={cn(
                                  'size-3',
                                  syncMutation.isPending && syncMutation.variables === acc.id && 'animate-spin text-primary'
                                )}
                              />
                              Sync
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              disabled={disconnectMutation.isPending && disconnectMutation.variables === acc.id}
                              onClick={() => handleDisconnect(acc)}
                              title="Disconnect Account"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-card/50">
                    <Cloud className="mx-auto size-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-foreground">No Cloud Connectors Linked</p>
                    <p className="mt-1">Connect your AWS, GCP, or Azure environments to enable autonomous discovery.</p>
                    <Button size="sm" className="mt-4 gap-1.5" onClick={() => setConnectModalOpen(true)}>
                      <Plus className="size-4" /> Connect Cloud Account
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Workspace Governance */}
            <TabsContent value="workspace" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      Active Tenant Workspace
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Identity isolation boundaries and tenancy configuration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {isOrgPending ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Workspace Name</span>
                            <span className="font-semibold text-foreground text-sm">{currentOrg?.name ?? 'CloudPilot Tenant'}</span>
                          </div>
                          <Badge variant="secondary" className="capitalize">{currentOrg?.role ?? 'owner'}</Badge>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Workspace UUID</span>
                            <span className="font-mono text-[11px] text-muted-foreground">{currentOrg?.id ?? 'default'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentOrg?.id || '', 'org-uuid')}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {copiedId === 'org-uuid' ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Cpu className="size-4 text-purple-500" />
                      AI & Governance Engine
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Autonomous LLM copilot telemetry and discovery parameters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Continuous Discovery</span>
                        <span className="font-medium text-foreground">Background Worker Active (every 30s)</span>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">Healthy</Badge>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">AI Engine Provider</span>
                        <span className="font-medium text-foreground">Multi-Cloud Copilot (Anthropic & Bedrock)</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: Compliance Audit Trail */}
            <TabsContent value="audit" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="size-4 text-emerald-500" />
                        Immutable Audit Log
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Chronological, tamper-resistant trail of all security changes, cloud connector mutations, and access grants.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px]">SOC 2 Compliant</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isAuditPending ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : auditEvents && auditEvents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Target Entity</TableHead>
                          <TableHead className="text-right">Payload</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditEvents.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(e.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <span className="font-medium text-xs text-foreground block">{e.actorName || 'System'}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{e.actorEmail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {e.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {e.targetType} {e.targetId ? `(${e.targetId.slice(0, 8)}...)` : ''}
                            </TableCell>
                            <TableCell className="text-right">
                              {e.metadata && Object.keys(e.metadata).length > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs font-mono"
                                  onClick={() => setSelectedAuditMeta(e.metadata || null)}
                                >
                                  View JSON
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No audit events logged yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Connect Cloud Account Modal */}
          <ConnectAccountModal
            open={connectModalOpen}
            onOpenChange={setConnectModalOpen}
          />

          {/* Audit Event JSON Metadata Modal */}
          <Dialog open={Boolean(selectedAuditMeta)} onOpenChange={() => setSelectedAuditMeta(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">Audit Event Metadata</DialogTitle>
                <DialogDescription className="text-xs">
                  Raw JSON context captured at event recording time.
                </DialogDescription>
              </DialogHeader>
              <pre className="p-3 bg-muted/80 rounded-md text-[11px] font-mono overflow-auto max-h-80 whitespace-pre-wrap border border-border">
                {JSON.stringify(selectedAuditMeta, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
