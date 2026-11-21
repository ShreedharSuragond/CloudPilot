import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSuppressFindingMutation } from './policies.mutations'

interface SuppressFindingModalProps {
  findingId: string | null
  ruleName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuppressFindingModal({
  findingId,
  ruleName,
  open,
  onOpenChange,
}: SuppressFindingModalProps) {
  const [reason, setReason] = React.useState('')
  const suppressMutation = useSuppressFindingMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!findingId || !reason.trim()) return

    suppressMutation.mutate(
      { findingId, reason: reason.trim() },
      {
        onSuccess: () => {
          onOpenChange(false)
          setReason('')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-5 text-amber-500" />
            Suppress Policy Finding
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Suppressing this finding hides it from active alerts and excludes it from compliance penalty calculations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {ruleName && (
            <div className="rounded-md bg-muted/40 p-2.5 text-xs">
              <span className="font-semibold text-foreground">Rule: </span>
              <span className="font-mono text-[11px] text-muted-foreground">{ruleName}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="suppress-reason" className="text-xs font-semibold text-foreground">
              Justification / Business Reason
            </label>
            <textarea
              id="suppress-reason"
              required
              rows={3}
              placeholder="e.g. Compensating control in place via WAF; approved by SecOps lead until Q3."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={!reason.trim() || suppressMutation.isPending}
            >
              {suppressMutation.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Confirm Suppression
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
