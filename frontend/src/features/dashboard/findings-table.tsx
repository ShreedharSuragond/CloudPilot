import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentFindingsQuery } from './dashboard.queries'

interface FindingsTableProps {
  onAskCopilot: (question: string) => void
}

export function FindingsTable({ onAskCopilot }: FindingsTableProps) {
  const { data: findings, isPending } = useRecentFindingsQuery()

  const severityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <Badge variant="destructive" className="text-[10px] uppercase font-mono">Critical</Badge>
      case 'high':
        return <Badge variant="warning" className="text-[10px] uppercase font-mono">High</Badge>
      case 'medium':
        return <Badge variant="secondary" className="text-[10px] uppercase font-mono">Medium</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] uppercase font-mono">Low</Badge>
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldAlert className="size-4.5 text-amber-500" />
            Security & Policy Posture
          </CardTitle>
          <CardDescription className="text-xs">
            Automated compliance checks across cloud storage, IAM permissions, and AI endpoints.
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[11px] gap-1">
          <AlertTriangle className="size-3 text-amber-500" />
          Active Guardrails
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !findings || findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">Zero Policy Violations</p>
            <p className="text-xs text-muted-foreground">All scanned cloud assets comply with your guardrail baseline.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {severityBadge(finding.severity)}
                    <span className="text-xs font-semibold text-foreground">{finding.ruleName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {finding.provider.toUpperCase()} • {finding.service}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{finding.description}</p>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span className="font-mono text-[10px] text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {finding.resourceName}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{finding.remediationGuidance}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() =>
                      onAskCopilot(
                        `How do I resolve "${finding.ruleName}" for ${finding.resourceName} (${finding.provider})? Guidance: ${finding.remediationGuidance}`
                      )
                    }
                  >
                    <Sparkles className="size-3 text-primary" />
                    Fix with Copilot
                    <ExternalLink className="size-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-border mt-auto">
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
            <Link to="/policies">
              <ShieldCheck className="size-3.5 text-primary" /> View All Policy Findings & Frameworks <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
