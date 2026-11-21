import * as React from 'react'
import {
  Check,
  Copy,
  FileCode2,
  Loader2,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApplyRemediationMutation } from './ai-workloads.mutations'
import type { ApplyRemediationResponse } from './ai-workloads.queries'

interface RemediationCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceId?: string
  findingId?: string
  guardrail?: string
  resourceName?: string
}

export function RemediationCodeModal({
  open,
  onOpenChange,
  resourceId,
  findingId,
  guardrail,
  resourceName,
}: RemediationCodeModalProps) {
  const [remediationType, setRemediationType] = React.useState<'terraform' | 'cli'>('terraform')
  const [copied, setCopied] = React.useState(false)
  const [remediationData, setRemediationData] = React.useState<ApplyRemediationResponse | null>(null)

  const applyMutation = useApplyRemediationMutation()

  React.useEffect(() => {
    if (open && (resourceId || findingId)) {
      applyMutation.mutate(
        {
          resourceId: resourceId || undefined,
          findingId: findingId || undefined,
          guardrail: guardrail || undefined,
          remediationType,
        },
        {
          onSuccess: (data) => {
            setRemediationData(data)
          },
        }
      )
    } else if (!open) {
      setRemediationData(null)
      setCopied(false)
    }
  }, [open, resourceId, findingId, guardrail, remediationType])

  const handleCopy = () => {
    if (!remediationData?.code) return
    navigator.clipboard.writeText(remediationData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-emerald-500" />
              Autonomous Remediation Blueprint
            </DialogTitle>
            <Badge variant="outline" className="text-xs uppercase font-mono">
              {remediationData?.provider ?? 'Cloud'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {remediationData?.title ?? `Remediate security guardrail for ${resourceName ?? 'resource'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format Toggle */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={remediationType === 'terraform' ? 'default' : 'outline'}
                className="h-8 gap-1.5 text-xs"
                onClick={() => setRemediationType('terraform')}
                disabled={applyMutation.isPending}
              >
                <FileCode2 className="size-3.5" />
                Terraform HCL
              </Button>
              <Button
                type="button"
                size="sm"
                variant={remediationType === 'cli' ? 'default' : 'outline'}
                className="h-8 gap-1.5 text-xs"
                onClick={() => setRemediationType('cli')}
                disabled={applyMutation.isPending}
              >
                <Terminal className="size-3.5" />
                Cloud CLI Script
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleCopy}
              disabled={!remediationData?.code || applyMutation.isPending}
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy Blueprint
                </>
              )}
            </Button>
          </div>

          {/* Code Viewer */}
          <div className="relative rounded-lg border border-border bg-slate-950 p-4 font-mono text-xs text-slate-100 shadow-inner overflow-hidden">
            {applyMutation.isPending ? (
              <div className="flex h-48 items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>Synthesizing verified remediation blueprint...</span>
              </div>
            ) : remediationData?.code ? (
              <pre className="overflow-x-auto max-h-64 leading-relaxed whitespace-pre-wrap">
                <code>{remediationData.code}</code>
              </pre>
            ) : (
              <div className="flex h-48 items-center justify-center text-slate-400">
                No blueprint generated.
              </div>
            )}
          </div>

          {/* Instructions */}
          {remediationData?.instructions && remediationData.instructions.length > 0 && (
            <div className="space-y-1.5 rounded-md bg-muted/40 p-3 text-xs">
              <div className="font-semibold text-foreground">Execution Steps:</div>
              <ul className="space-y-1 text-muted-foreground list-none">
                {remediationData.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-primary font-mono">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
