import { CircleDollarSign, PieChart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useSpendBreakdownQuery } from './dashboard.queries'

export function SpendBreakdownCard() {
  const { data: spend, isPending } = useSpendBreakdownQuery()

  const providerStyles: Record<string, { bg: string; dot: string; border: string }> = {
    aws: { bg: 'bg-amber-500', dot: 'bg-amber-500', border: 'border-amber-500/20' },
    gcp: { bg: 'bg-blue-500', dot: 'bg-blue-500', border: 'border-blue-500/20' },
    azure: { bg: 'bg-cyan-500', dot: 'bg-cyan-500', border: 'border-cyan-500/20' },
  }

  const getProviderStyle = (provider: string) => {
    return providerStyles[provider.toLowerCase()] || { bg: 'bg-primary', dot: 'bg-primary', border: 'border-primary/20' }
  }

  const getCategoryStyle = (category: string) => {
    const c = category.toLowerCase()
    if (c.includes('ai') || c.includes('ml')) {
      return { bg: 'bg-violet-500', dot: 'bg-violet-500', border: 'border-violet-500/20' }
    }
    return { bg: 'bg-emerald-500', dot: 'bg-emerald-500', border: 'border-emerald-500/20' }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CircleDollarSign className="size-4.5 text-primary shrink-0" />
            <span className="truncate">Spend Distribution</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Normalized cost breakdown across cloud providers and AI workloads.
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[11px] gap-1 shrink-0 whitespace-nowrap">
          <PieChart className="size-3" /> MTD Run Rate
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !spend || (spend.byProvider.length === 0 && spend.byCategory.length === 0) ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No billing records synchronized yet. Connect an AWS or GCP account to activate cost tracking.
          </div>
        ) : (
          <>
            {/* By Cloud Provider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>By Cloud Provider</span>
                <span className="font-mono text-[11px] text-foreground font-medium">
                  ${spend.byProvider.reduce((acc, curr) => acc + (curr.spend ?? 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Stacked multi-cloud bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 gap-0.5 border border-border/40">
                {spend.byProvider.map((item, idx) => {
                  const style = getProviderStyle(item.provider)
                  const pct = Math.max(Number(item.percent ?? 0), 2)
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%` }}
                      className={cn('h-full rounded-full transition-all', style.bg)}
                      title={`${item.provider.toUpperCase()}: $${(item.spend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${(item.percent ?? 0).toFixed(1)}%)`}
                    />
                  )
                })}
              </div>

              {/* Provider List Rows */}
              <div className="space-y-2 pt-1">
                {spend.byProvider.map((item, idx) => {
                  const style = getProviderStyle(item.provider)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('size-2.5 shrink-0 rounded-full', style.dot)} />
                        <span className="font-bold uppercase tracking-wider text-foreground">
                          {item.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-semibold text-foreground">
                          ${(item.spend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-medium">
                          {(item.percent ?? 0).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* By Architecture Tier */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>By Architecture Tier</span>
              </div>

              {/* Stacked category bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 gap-0.5 border border-border/40">
                {spend.byCategory.map((item, idx) => {
                  const style = getCategoryStyle(item.category)
                  const pct = Math.max(Number(item.percent ?? 0), 2)
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%` }}
                      className={cn('h-full rounded-full transition-all', style.bg)}
                      title={`${item.category}: $${(item.spend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${(item.percent ?? 0).toFixed(1)}%)`}
                    />
                  )
                })}
              </div>

              {/* Category List Rows */}
              <div className="space-y-2 pt-1">
                {spend.byCategory.map((item, idx) => {
                  const style = getCategoryStyle(item.category)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('size-2.5 shrink-0 rounded-full', style.dot)} />
                        <span className="font-medium text-foreground truncate">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-semibold text-foreground">
                          ${(item.spend ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 font-medium">
                          {(item.percent ?? 0).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
