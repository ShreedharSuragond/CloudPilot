import * as React from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  useComplianceSummaryQuery,
  usePolicyFindingsQuery,
  type PolicyFindingDetail,
} from '@/features/policies/policies.queries'
import {
  useEvaluatePoliciesMutation,
  useResolveFindingMutation,
} from '@/features/policies/policies.mutations'
import { SuppressFindingModal } from '@/features/policies/suppress-finding-modal'
import { CopilotDialog } from '@/features/dashboard/copilot-dialog'
import { cn } from '@/lib/utils'

export function PoliciesRoute() {
  const [statusTab, setStatusTab] = React.useState('open')
  const [severityFilter, setSeverityFilter] = React.useState('all')
  const [frameworkFilter, setFrameworkFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')

  // Modals state
  const [suppressModalOpen, setSuppressModalOpen] = React.useState(false)
  const [selectedFinding, setSelectedFinding] = React.useState<PolicyFindingDetail | null>(null)
  const [copilotOpen, setCopilotOpen] = React.useState(false)
  const [copilotInitialQuery, setCopilotInitialQuery] = React.useState<string | undefined>()

  const { data: summary, isPending: isSummaryPending } = useComplianceSummaryQuery()
  const {
    data: findings,
    isPending: isFindingsPending,
    refetch,
    isRefetching,
  } = usePolicyFindingsQuery({
    status: statusTab,
    severity: severityFilter,
    framework: frameworkFilter,
    search: search || undefined,
  })

  const evaluateMutation = useEvaluatePoliciesMutation()
  const resolveMutation = useResolveFindingMutation()

  const handleOpenCopilotRemediation = (finding: PolicyFindingDetail) => {
    setCopilotInitialQuery(
      `Please generate an automated Terraform and CLI remediation blueprint to fix finding '${finding.ruleName}' on resource '${finding.resourceName}' (${finding.provider} ${finding.service}). Description: ${finding.description}`
    )
    setCopilotOpen(true)
  }

  const handleOpenSuppress = (finding: PolicyFindingDetail) => {
    setSelectedFinding(finding)
    setSuppressModalOpen(true)
  }

  const handleResolve = (findingId: string) => {
    resolveMutation.mutate(findingId)
  }

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200'
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'cis':
        return <Badge variant="outline" className="text-[10px] uppercase font-mono">CIS Benchmark</Badge>
      case 'soc2':
        return <Badge variant="outline" className="text-[10px] uppercase font-mono">SOC 2</Badge>
      case 'hipaa':
        return <Badge variant="outline" className="text-[10px] uppercase font-mono">HIPAA</Badge>
      case 'ai_safety':
        return <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">AI Safety</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] uppercase font-mono">ISO 27001</Badge>
    }
  }

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Policies & Governance' }]}>
        {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Security Guardrails & AI Governance
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Policy Compliance
              </h1>
              <p className="text-sm text-muted-foreground">
                Continuous compliance evaluation across CIS benchmarks, SOC 2, and AI foundation model safety guardrails.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={cn('size-3.5', isRefetching && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm"
                onClick={() => evaluateMutation.mutate()}
                disabled={evaluateMutation.isPending}
              >
                <ShieldAlert className={cn('size-3.5', evaluateMutation.isPending && 'animate-spin')} />
                {evaluateMutation.isPending ? 'Evaluating Policies...' : 'Run Compliance Scan'}
              </Button>
            </div>
          </div>

          {/* 4 Compliance KPI Metric Cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Compliance Metrics">
            {/* Overall Score */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Overall Compliance Score
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight">
                      {summary?.overallScore?.toFixed(1) ?? '100.0'}%
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                      Grade A
                    </Badge>
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary?.totalOpenFindings ?? 0} active policy violations
                </p>
              </CardContent>
            </Card>

            {/* CIS Benchmark Score */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  CIS Cloud Benchmark
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                  <Shield className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    {summary?.frameworkScores?.cis?.toFixed(1) ?? '100.0'}%
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary?.criticalCount ?? 0} critical severity findings
                </p>
              </CardContent>
            </Card>

            {/* AI Foundation Model Safety */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  AI Workload Guardrails
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <BrainCircuit className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    {summary?.frameworkScores?.ai_safety?.toFixed(1) ?? '100.0'}%
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Bedrock, Vertex AI, & SageMaker guardrails
                </p>
              </CardContent>
            </Card>

            {/* SOC 2 & Regulated Data */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  SOC 2 & HIPAA Posture
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isSummaryPending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold tracking-tight">
                    {summary?.frameworkScores?.soc2?.toFixed(1) ?? '100.0'}%
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Encryption at rest & access audit status
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Filter Bar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search findings, rules, or resources..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status Tabs */}
                  <Tabs value={statusTab} onValueChange={setStatusTab}>
                    <TabsList>
                      <TabsTrigger value="open">Open</TabsTrigger>
                      <TabsTrigger value="suppressed">Suppressed</TabsTrigger>
                      <TabsTrigger value="resolved">Resolved</TabsTrigger>
                      <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Severity Filter */}
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  {/* Framework Filter */}
                  <select
                    value={frameworkFilter}
                    onChange={(e) => setFrameworkFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="all">All Frameworks</option>
                    <option value="cis">CIS Benchmark</option>
                    <option value="soc2">SOC 2</option>
                    <option value="hipaa">HIPAA</option>
                    <option value="ai_safety">AI Safety Guardrails</option>
                    <option value="iso27001">ISO 27001</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            {/* Findings Table */}
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Rule & Description</TableHead>
                    <TableHead>Framework</TableHead>
                    <TableHead>Affected Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFindingsPending ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-60" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : !findings || findings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <CheckCircle2 className="size-6 text-emerald-500" />
                          <span className="font-semibold text-foreground">No policy findings found</span>
                          <span className="text-xs text-muted-foreground">
                            {statusTab === 'open'
                              ? 'All continuous compliance checks passed successfully for this filter.'
                              : 'No findings match the current criteria.'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    findings.map((item) => (
                      <TableRow key={item.id}>
                        {/* Severity */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] uppercase font-semibold capitalize', getSeverityBadgeClass(item.severity))}
                          >
                            {item.severity}
                          </Badge>
                        </TableCell>

                        {/* Rule & Description */}
                        <TableCell className="max-w-md">
                          <div className="text-xs font-semibold text-foreground font-mono">
                            {item.ruleName}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {item.description}
                          </p>
                          {item.suppressionReason && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 italic">
                              Suppressed: {item.suppressionReason}
                            </p>
                          )}
                        </TableCell>

                        {/* Framework */}
                        <TableCell>
                          {getFrameworkBadge(item.framework)}
                        </TableCell>

                        {/* Resource */}
                        <TableCell>
                          <div className="text-xs font-medium text-foreground truncate max-w-[180px]">
                            {item.resourceName}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-mono">
                            <span>{item.provider}</span> • <span>{item.service}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant={item.status === 'open' ? 'secondary' : 'outline'}
                            className="text-[10px] capitalize"
                          >
                            {item.status}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'open' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                                  onClick={() => handleOpenCopilotRemediation(item)}
                                >
                                  <Sparkles className="size-3" />
                                  Fix with AI
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:bg-muted cursor-pointer"
                                  onClick={() => handleOpenSuppress(item)}
                                >
                                  Suppress
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                  onClick={() => handleResolve(item.id)}
                                >
                                  Resolve
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        {/* Suppress Finding Modal */}
        <SuppressFindingModal
          findingId={selectedFinding?.id ?? null}
          ruleName={selectedFinding?.ruleName}
          open={suppressModalOpen}
          onOpenChange={setSuppressModalOpen}
        />

        {/* Copilot Dialog for AI Remediation */}
        <CopilotDialog
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          initialQuestion={copilotInitialQuery}
        />
      </AppShell>
    </AuthGuard>
  )
}
