import * as React from 'react'
import {
  Activity,
  BrainCircuit,
  DollarSign,
  FileCode2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  useAIWorkloadsQuery,
  type AIWorkloadItem,
} from '@/features/ai-workloads/ai-workloads.queries'
import { RemediationCodeModal } from '@/features/ai-workloads/remediation-code-modal'
import { CopilotDialog } from '@/features/dashboard/copilot-dialog'
import { useEvaluatePoliciesMutation } from '@/features/policies/policies.mutations'
import { cn } from '@/lib/utils'

export function AIWorkloadsRoute() {
  const [providerFilter, setProviderFilter] = React.useState('all')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [guardrailFilter, setGuardrailFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')

  // Modals state
  const [remediationModalOpen, setRemediationModalOpen] = React.useState(false)
  const [selectedWorkload, setSelectedWorkload] = React.useState<AIWorkloadItem | null>(null)
  const [selectedGuardrail, setSelectedGuardrail] = React.useState<string | undefined>()

  const [copilotOpen, setCopilotOpen] = React.useState(false)
  const [copilotInitialQuery, setCopilotInitialQuery] = React.useState<string | undefined>()

  const {
    data,
    isPending,
    refetch,
    isRefetching,
  } = useAIWorkloadsQuery()

  const evaluateMutation = useEvaluatePoliciesMutation()

  const summary = data?.summary
  const workloads = data?.workloads

  // Filter workloads
  const filteredWorkloads = React.useMemo(() => {
    if (!workloads) return []
    return workloads.filter((item) => {
      if (providerFilter !== 'all' && item.provider !== providerFilter) return false
      if (typeFilter !== 'all' && item.resourceType !== typeFilter) return false
      if (guardrailFilter === 'compliant' && item.openFindingsCount > 0) return false
      if (guardrailFilter === 'violations' && item.openFindingsCount === 0) return false
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchesName = item.name.toLowerCase().includes(query)
        const matchesService = item.service.toLowerCase().includes(query)
        const matchesModel = item.modelProvider.toLowerCase().includes(query)
        if (!matchesName && !matchesService && !matchesModel) return false
      }
      return true
    })
  }, [workloads, providerFilter, typeFilter, guardrailFilter, search])

  const handleOpenRemediation = (item: AIWorkloadItem, guardrailName?: string) => {
    setSelectedWorkload(item)
    setSelectedGuardrail(guardrailName)
    setRemediationModalOpen(true)
  }

  const handleOpenCopilot = (item: AIWorkloadItem) => {
    setCopilotInitialQuery(
      `Please analyze the security and cost governance of AI model '${item.name}' (${item.service} by ${item.modelProvider} on ${item.provider.toUpperCase()}). Monthly cost is $${(item.monthlyCost ?? 0).toFixed(2)}. Guardrails: PII Masking=${item.guardrails.piiFiltering}, Audit Logging=${item.guardrails.modelAuditLogging}, KMS CMK=${item.guardrails.kmsEncryption}. What are the security gaps and optimization recommendations?`
    )
    setCopilotOpen(true)
  }

  const handleScanGuardrails = () => {
    evaluateMutation.mutate(undefined, {
      onSuccess: () => {
        refetch()
      },
    })
  }

  const compliancePercentage = summary
    ? summary.totalAIWorkloads > 0
      ? Math.round((summary.guardrailsCompliantCount / summary.totalAIWorkloads) * 100)
      : 100
    : 100

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <BrainCircuit className="size-6 text-purple-500" />
                AI Workloads & Foundation Models
              </h1>
              <p className="text-sm text-muted-foreground">
                Centralized governance across AWS Bedrock, SageMaker, Vertex AI, and Azure OpenAI foundation models.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={cn('mr-1.5 size-3.5', isRefetching && 'animate-spin')}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanGuardrails}
                disabled={evaluateMutation.isPending}
              >
                <Shield
                  className={cn('mr-1.5 size-3.5', evaluateMutation.isPending && 'animate-spin')}
                />
                Scan Guardrails
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setCopilotInitialQuery('What are the key security and cost risks across our active multi-cloud foundation models?')
                  setCopilotOpen(true)
                }}
              >
                <Sparkles className="size-3.5" />
                Ask AI Copilot
              </Button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total AI Workloads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total AI Workloads
                </CardTitle>
                <div className="rounded-md bg-purple-500/10 p-1.5 text-purple-500">
                  <BrainCircuit className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono">
                      {summary?.totalAIWorkloads ?? 0}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary?.activeEndpoints ?? 0} endpoints, {summary?.foundationModels ?? 0} models
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly AI Spend */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly AI Spend
                </CardTitle>
                <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-500">
                  <DollarSign className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      ${(summary?.monthlyAISpend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Inference tokens & hosting run-rate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Endpoints */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dedicated Endpoints
                </CardTitle>
                <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-500">
                  <Activity className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {summary?.activeEndpoints ?? 0}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      vLLM, SageMaker & Vertex endpoints
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guardrails Compliance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Guardrails Compliance
                </CardTitle>
                <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-500">
                  <ShieldCheck className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {compliancePercentage}%
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-emerald-500">
                        {summary?.guardrailsCompliantCount ?? 0} safe
                      </span>
                      <span>•</span>
                      <span className="font-medium text-rose-500">
                        {summary?.guardrailsViolationsCount ?? 0} with violations
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search Toolbar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by model, endpoint, or provider..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Filter selects */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Cloud Providers</option>
                    <option value="aws">AWS (Bedrock / SageMaker)</option>
                    <option value="gcp">GCP (Vertex AI)</option>
                    <option value="azure">Azure (OpenAI Service)</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Types</option>
                    <option value="ai_endpoint">Dedicated Endpoints</option>
                    <option value="ai_model">Foundation Models</option>
                  </select>

                  <select
                    value={guardrailFilter}
                    onChange={(e) => setGuardrailFilter(e.target.value)}
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Guardrail Statuses</option>
                    <option value="compliant">Compliant Only</option>
                    <option value="violations">Violations Detected</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Workloads Catalog Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Active AI Foundation Models & Endpoints</CardTitle>
              <CardDescription className="text-xs">
                Real-time inventory of foundation models, estimated token throughput, and safety guardrail enforcement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredWorkloads.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <BrainCircuit className="size-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No AI Workloads Matching Filter</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect an AWS, GCP, or Azure account to automatically discover foundation models.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-xs">Model & Service</TableHead>
                        <TableHead className="text-xs">Provider</TableHead>
                        <TableHead className="text-xs">Type & Region</TableHead>
                        <TableHead className="text-xs">Context & Tokens</TableHead>
                        <TableHead className="text-xs">Guardrails Enforcement</TableHead>
                        <TableHead className="text-xs">Monthly Cost</TableHead>
                        <TableHead className="text-right text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkloads.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          {/* Name & Service */}
                          <TableCell className="font-medium">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-foreground">
                                  {item.name}
                                </span>
                                {item.openFindingsCount > 0 ? (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    {item.openFindingsCount} Violation
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                                    Safe
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <span>{item.service}</span>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]" title={item.resourceId}>
                                  {item.resourceId}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Model Provider */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] uppercase font-semibold font-mono',
                                item.provider === 'aws'
                                  ? 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                                  : item.provider === 'gcp'
                                    ? 'border-blue-500/40 text-blue-500 bg-blue-500/10'
                                    : 'border-sky-500/40 text-sky-500 bg-sky-500/10'
                              )}
                            >
                              {item.modelProvider}
                            </Badge>
                          </TableCell>

                          {/* Type & Region */}
                          <TableCell className="text-xs">
                            <div className="space-y-0.5">
                              <div className="capitalize text-foreground font-medium">
                                {item.resourceType.replace('_', ' ')}
                              </div>
                              <div className="font-mono text-[11px] text-muted-foreground">
                                {item.region}
                              </div>
                            </div>
                          </TableCell>

                          {/* Context Window & Tokens */}
                          <TableCell className="text-xs">
                            <div className="space-y-0.5 font-mono">
                              <div className="text-foreground">
                                {item.contextWindow ? `${(item.contextWindow / 1000).toFixed(0)}k context` : 'Managed'}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                ~{((item.estimatedTokensPerDay ?? 0) / 1000000).toFixed(1)}M tokens/day
                              </div>
                            </div>
                          </TableCell>

                          {/* Guardrails Status */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {/* PII Masking */}
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                                  item.guardrails.piiFiltering
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                )}
                                title={item.guardrails.piiFiltering ? 'PII masking enabled' : 'PII masking disabled'}
                              >
                                <Lock className="size-3" />
                                {item.guardrails.piiFiltering ? 'PII Filtered' : 'No PII Mask'}
                              </span>

                              {/* Invocation Audit Logging */}
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                                  item.guardrails.modelAuditLogging
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                )}
                                title={item.guardrails.modelAuditLogging ? 'Model invocation audit logs active' : 'Model audit logging disabled'}
                              >
                                <Activity className="size-3" />
                                {item.guardrails.modelAuditLogging ? 'Audit Logged' : 'No Audit'}
                              </span>

                              {/* KMS CMK */}
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                                  item.guardrails.kmsEncryption
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                )}
                                title={item.guardrails.kmsEncryption ? 'Customer Managed KMS Key' : 'Default Platform Encryption'}
                              >
                                <Shield className="size-3" />
                                {item.guardrails.kmsEncryption ? 'KMS CMK' : 'Platform Key'}
                              </span>
                            </div>
                          </TableCell>

                          {/* Monthly Cost */}
                          <TableCell className="font-mono text-xs font-bold text-foreground">
                            ${(item.monthlyCost ?? 0).toFixed(2)}/mo
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-[11px]"
                                onClick={() => handleOpenRemediation(item)}
                              >
                                <FileCode2 className="size-3" />
                                Blueprint
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-[11px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                onClick={() => handleOpenCopilot(item)}
                              >
                                <Sparkles className="size-3" />
                                Copilot
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Autonomous Remediation Blueprint Modal */}
        <RemediationCodeModal
          open={remediationModalOpen}
          onOpenChange={setRemediationModalOpen}
          resourceId={selectedWorkload?.id}
          resourceName={selectedWorkload?.name}
          guardrail={selectedGuardrail}
        />

        {/* AI Copilot Dialog */}
        <CopilotDialog
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          initialQuery={copilotInitialQuery}
        />
      </AppShell>
    </AuthGuard>
  )
}
export default AIWorkloadsRoute
