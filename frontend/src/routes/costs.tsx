import * as React from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Calendar,
  DollarSign,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCostTrendsQuery,
  useCostAnomaliesQuery,
  useBudgetsQuery,
  type Budget,
  type CostAnomaly,
} from '@/features/finops/finops.queries'
import { useDeleteBudgetMutation } from '@/features/finops/finops.mutations'
import { CreateBudgetModal } from '@/features/finops/create-budget-modal'
import { CopilotDialog } from '@/features/dashboard/copilot-dialog'
import { cn } from '@/lib/utils'

export function CostsRoute() {
  const [createBudgetOpen, setCreateBudgetOpen] = React.useState(false)
  const [copilotOpen, setCopilotOpen] = React.useState(false)
  const [copilotInitialQuery, setCopilotInitialQuery] = React.useState<string | undefined>()

  const {
    data: trends,
    isPending: isTrendsPending,
    refetch: refetchTrends,
    isRefetching: isTrendsRefetching,
  } = useCostTrendsQuery()

  const {
    data: anomalies,
    isPending: isAnomaliesPending,
    refetch: refetchAnomalies,
  } = useCostAnomaliesQuery()

  const {
    data: budgets,
    isPending: isBudgetsPending,
    refetch: refetchBudgets,
  } = useBudgetsQuery()

  const deleteBudgetMutation = useDeleteBudgetMutation()

  const handleRefresh = () => {
    refetchTrends()
    refetchAnomalies()
    refetchBudgets()
  }

  const handleRemediateAnomaly = (anomaly: CostAnomaly) => {
    setCopilotInitialQuery(
      `How can we optimize and reduce the monthly spend for ${anomaly.provider.toUpperCase()} resource '${anomaly.resourceName}' (${anomaly.service})? It is currently costing $${(anomaly.actualMonthlyCost ?? 0).toFixed(2)}/mo which is a ${anomaly.spikePercent ?? 0}% spike over expected baseline ($${(anomaly.expectedMonthlyCost ?? 0).toFixed(2)}/mo). Reason: ${anomaly.explanation ?? 'Unusual usage'}`
    )
    setCopilotOpen(true)
  }

  const handleDeleteBudget = (budget: Budget) => {
    if (confirm(`Are you sure you want to delete budget "${budget.name}"?`)) {
      deleteBudgetMutation.mutate(budget.id)
    }
  }

  // Chart options for 30-day time-series
  const chartOption = React.useMemo(() => {
    if (!trends || !trends.dailySeries || trends.dailySeries.length === 0) {
      return null
    }

    const dates = trends.dailySeries.map((d) => d.date.slice(5))
    const infraSeries = trends.dailySeries.map((d) => d.infraSpend)
    const aiSeries = trends.dailySeries.map((d) => d.aiSpend)

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#334155' },
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return ''
          const date = params[0].name
          let total = 0
          let lines = `<div class="font-sans text-xs pb-1 font-semibold border-b border-border">${date}</div>`
          for (const p of params) {
            total += Number(p.value || 0)
            lines += `<div class="flex items-center justify-between gap-4 text-xs pt-1">
              <span class="flex items-center gap-1.5">${p.marker} ${p.seriesName}</span>
              <span class="font-mono font-medium">$${Number(p.value).toFixed(2)}</span>
            </div>`
          }
          lines += `<div class="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1 border-t border-border font-semibold">
            <span>Total Day Spend</span>
            <span class="font-mono">$${total.toFixed(2)}</span>
          </div>`
          return lines
        },
      },
      legend: {
        data: ['Traditional Cloud Infra', 'AI Inference & Models'],
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 12 },
      },
      grid: {
        left: '2%',
        right: '2%',
        top: '8%',
        bottom: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: '${value}',
        },
        splitLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.1)', type: 'dashed' },
        },
      },
      series: [
        {
          name: 'Traditional Cloud Infra',
          type: 'line',
          stack: 'Total',
          smooth: true,
          lineStyle: { width: 2, color: '#3b82f6' },
          showSymbol: false,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.45)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
              ],
            },
          },
          emphasis: { focus: 'series' },
          data: infraSeries,
        },
        {
          name: 'AI Inference & Models',
          type: 'line',
          stack: 'Total',
          smooth: true,
          lineStyle: { width: 2, color: '#a855f7' },
          showSymbol: false,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(168, 85, 247, 0.5)' },
                { offset: 1, color: 'rgba(168, 85, 247, 0.05)' },
              ],
            },
          },
          emphasis: { focus: 'series' },
          data: aiSeries,
        },
      ],
    }
  }, [trends])

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Cost Management' }]}>
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
                <DollarSign className="size-6 text-emerald-500" />
                Cost Management & FinOps
              </h1>
              <p className="text-sm text-muted-foreground">
                Multicloud spend run-rate, AI workload cost attribution, budget tracking, and real-time anomaly detection.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isTrendsRefetching}
              >
                <RefreshCw
                  className={cn('mr-1.5 size-3.5', isTrendsRefetching && 'animate-spin')}
                />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setCreateBudgetOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Create Budget
              </Button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Monthly Run Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly Run-Rate
                </CardTitle>
                <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-500">
                  <TrendingUp className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isTrendsPending ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono">
                      ${(trends?.monthlyRunRate ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center text-amber-500 font-medium">
                        <ArrowUpRight className="size-3.5" />
                        +{trends?.percentChange ?? 0}%
                      </span>
                      <span>vs last month</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projected Spend */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Projected Month-End
                </CardTitle>
                <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-500">
                  <Calendar className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isTrendsPending ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono">
                      ${(trends?.projectedSpend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estimated based on current daily burn
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Workloads Ratio */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Workload Spend
                </CardTitle>
                <div className="rounded-md bg-purple-500/10 p-1.5 text-purple-500">
                  <BrainCircuit className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isTrendsPending ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono text-purple-400">
                      {trends?.aiSpendRatio ?? 0}%
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Inference & Foundation Model share
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Anomalies & Budgets */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Anomalies
                </CardTitle>
                <div className="rounded-md bg-rose-500/10 p-1.5 text-rose-500">
                  <AlertTriangle className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isAnomaliesPending ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono text-rose-400">
                      {anomalies?.length ?? 0}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Across {budgets?.length ?? 0} monitored budgets
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 30-Day Daily Spend Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>30-Day Spend Trend (Traditional Cloud vs AI Models)</span>
                <Badge variant="outline" className="text-xs font-normal">
                  Updated hourly
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Stacked breakdown of daily compute, storage, and networking versus foundation model token inference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTrendsPending ? (
                <Skeleton className="h-[280px] w-full" />
              ) : chartOption ? (
                <div className="h-[300px] w-full">
                  <ReactECharts
                    option={chartOption}
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  No spend trend data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budgets Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Organisation Budgets
                </h2>
                <p className="text-xs text-muted-foreground">
                  Monitored spend thresholds with early warning alerting.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateBudgetOpen(true)}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add Budget
              </Button>
            </div>

            {isBudgetsPending ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : budgets && budgets.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {budgets.map((b) => {
                  const statusColor =
                    b.status === 'exceeded'
                      ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                      : b.status === 'warning'
                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'

                  const progressColor =
                    b.status === 'exceeded'
                      ? 'bg-rose-500'
                      : b.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'

                  return (
                    <Card key={b.id} className="relative overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-sm font-semibold">{b.name}</CardTitle>
                            <span className="text-[11px] capitalize text-muted-foreground">
                              {b.period} budget
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn('text-[11px] uppercase font-semibold', statusColor)}>
                              {b.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteBudget(b)}
                              title="Delete budget"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-mono text-base font-bold text-foreground">
                            ${(b.currentSpend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            of ${(b.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn('h-full transition-all duration-300', progressColor)}
                              style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{b.percentUsed}% consumed</span>
                            <span>Alert at {b.alertThresholdPercent}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <DollarSign className="size-10 text-muted-foreground/50 mb-2" />
                <h3 className="text-sm font-semibold text-foreground">No Budgets Configured</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Create your first monthly or quarterly budget to get alerted before cloud spending exceeds expectations.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setCreateBudgetOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Create Budget
                </Button>
              </Card>
            )}
          </div>

          {/* Cost Anomalies & Spikes Feed */}
          <div>
            <div className="mb-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                Cost Anomalies & Sudden Spikes
              </h2>
              <p className="text-xs text-muted-foreground">
                Automated statistical anomaly detection identifying high run-rate variance and unoptimized workloads.
              </p>
            </div>

            {isAnomaliesPending ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : anomalies && anomalies.length > 0 ? (
              <div className="space-y-3">
                {anomalies.map((anom) => (
                  <Card key={anom.id} className="border-amber-500/20 bg-amber-500/[0.02]">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] uppercase font-semibold font-mono',
                                anom.provider === 'aws'
                                  ? 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                                  : anom.provider === 'gcp'
                                    ? 'border-blue-500/40 text-blue-500 bg-blue-500/10'
                                    : 'border-sky-500/40 text-sky-500 bg-sky-500/10'
                              )}
                            >
                              {anom.provider}
                            </Badge>
                            <span className="text-sm font-semibold text-foreground">
                              {anom.resourceName}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              ({anom.service})
                            </span>
                            <Badge variant="destructive" className="text-[10px] font-semibold">
                              +{anom.spikePercent}% Spike
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {anom.explanation}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Current Monthly</div>
                            <div className="font-mono text-base font-bold text-foreground">
                              ${(anom.actualMonthlyCost ?? 0).toFixed(2)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Baseline: ${(anom.expectedMonthlyCost ?? 0).toFixed(2)}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => handleRemediateAnomaly(anom)}
                          >
                            <Sparkles className="size-3.5 text-primary" />
                            Optimize with AI
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <DollarSign className="size-10 text-emerald-500/50 mb-2" />
                <h3 className="text-sm font-semibold text-foreground">No Cost Anomalies Detected</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  All active cloud resources are operating within expected baseline spending ranges.
                </p>
              </Card>
            )}
          </div>

        {/* Create Budget Modal */}
        <CreateBudgetModal
          open={createBudgetOpen}
          onOpenChange={setCreateBudgetOpen}
        />

        {/* AI Copilot Remediator Dialog */}
        <CopilotDialog
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          initialQuery={copilotInitialQuery}
        />
      </AppShell>
    </AuthGuard>
  )
}
export default CostsRoute
