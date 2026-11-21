import * as React from 'react'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Code2,
  DollarSign,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCopilotInsightsQuery } from './dashboard.queries'
import { useCopilotRemediateMutation } from './dashboard.mutations'

interface CopilotInsightsCardProps {
  onAskCopilot: (question: string) => void
}

export function CopilotInsightsCard({ onAskCopilot }: CopilotInsightsCardProps) {
  const { data: insights, isPending } = useCopilotInsightsQuery()
  const remediateMutation = useCopilotRemediateMutation()
  const [activeRemediation, setActiveRemediation] = React.useState<{
    id: string
    code: string
  } | null>(null)

  const handleRemediate = (insightId: string, title: string) => {
    if (activeRemediation?.id === insightId) {
      setActiveRemediation(null)
      return
    }

    // If the insight already contains remediation code from the AI engine, display it immediately
    const found = insights?.find((i, idx) => (i.id || `insight-${idx}`) === insightId)
    if (found?.remediationCode) {
      setActiveRemediation({
        id: insightId,
        code: found.remediationCode,
      })
      return
    }

    remediateMutation.mutate(insightId, {
      onSuccess: (res) => {
        setActiveRemediation({
          id: insightId,
          code: res.remediation || res.remediationCode || 'Remediation completed successfully.',
        })
      },
      onError: () => {
        onAskCopilot(`How do I remediate: "${title}"? Provide specific CLI commands and Terraform.`)
      },
    })
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    Cost: <DollarSign className="size-3.5 text-emerald-500" />,
    cost_optimization: <DollarSign className="size-3.5 text-emerald-500" />,
    Security: <ShieldAlert className="size-3.5 text-amber-500" />,
    security: <ShieldAlert className="size-3.5 text-amber-500" />,
    'AI Workload': <BrainCircuit className="size-3.5 text-purple-500" />,
    ai_workload: <BrainCircuit className="size-3.5 text-purple-500" />,
  }

  const impactVariants: Record<string, 'destructive' | 'warning' | 'default' | 'outline'> = {
    high: 'destructive',
    medium: 'warning',
    low: 'outline',
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="size-4.5 text-primary" />
            AI Copilot Insights
          </CardTitle>
          <CardDescription className="text-xs">
            Autonomous recommendations synthesized across multi-cloud inventory and policies.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => onAskCopilot('Summarize my top 3 cloud optimization priorities and risks.')}
        >
          <Sparkles className="size-3.5 text-primary" />
          Ask Copilot
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !insights || insights.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No pending AI recommendations. Your infrastructure is currently aligned with best practices!
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((item, idx) => {
              const itemId = item.id || `insight-${idx}`
              const isRemediating = Boolean(activeRemediation && activeRemediation.id === itemId)
              const savings = (item as any).estimatedSavings ?? (item as any).estimatedMonthlySavings ?? 0
              const rawImpact = (item as any).impact || 'medium'

              return (
                <div
                  key={itemId}
                  className="rounded-lg border border-border bg-card p-3.5 space-y-2.5 transition-shadow hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded bg-muted">
                        {categoryIcons[item.category] || <Sparkles className="size-3.5 text-primary" />}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {savings > 0 && (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                          Save ${Number(savings).toFixed(0)}/mo
                        </Badge>
                      )}
                      <Badge
                        variant={impactVariants[rawImpact] || 'default'}
                        className="text-[10px] capitalize"
                      >
                        {rawImpact} Impact
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Inline Remediation code preview if clicked */}
                  {isRemediating && activeRemediation && (
                    <div className="rounded-md bg-zinc-950 p-2.5 text-[11px] font-mono text-zinc-100 overflow-x-auto border border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between text-zinc-400 text-[10px] pb-1 border-b border-zinc-800">
                        <span className="flex items-center gap-1">
                          <Code2 className="size-3 text-primary" /> Remediation Blueprint
                        </span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Ready to apply
                        </span>
                      </div>
                      <pre className="pt-1 whitespace-pre-wrap">{activeRemediation.code}</pre>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="font-medium text-foreground">Category:</span> {item.category.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => onAskCopilot(`Explain this recommendation: "${item.title}". Context: ${item.summary}`)}
                      >
                        Explain
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2.5 text-[11px] gap-1"
                        disabled={remediateMutation.isPending && remediateMutation.variables === itemId}
                        onClick={() => handleRemediate(itemId, item.title)}
                      >
                        {remediateMutation.isPending && remediateMutation.variables === itemId ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Code2 className="size-3" />
                        )}
                        {isRemediating ? 'Hide Blueprint' : 'Remediate'}
                        <ArrowRight className="size-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
