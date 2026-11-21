import * as React from 'react'
import { DollarSign, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateBudgetMutation } from './finops.mutations'

interface CreateBudgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBudgetModal({ open, onOpenChange }: CreateBudgetModalProps) {
  const [name, setName] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [period, setPeriod] = React.useState('monthly')
  const [alertThreshold, setAlertThreshold] = React.useState(80)

  const createMutation = useCreateBudgetMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (!name.trim() || isNaN(numericAmount) || numericAmount <= 0) return

    createMutation.mutate(
      {
        name: name.trim(),
        amount: numericAmount,
        period,
        alertThresholdPercent: alertThreshold,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setName('')
          setAmount('')
          setPeriod('monthly')
          setAlertThreshold(80)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-5 text-emerald-500" />
            Create Cost Budget
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Set spend thresholds to monitor multicloud cost run-rate and prevent bill shocks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="budget-name" className="text-xs font-semibold text-foreground">
              Budget Name
            </label>
            <input
              id="budget-name"
              type="text"
              required
              placeholder="e.g. Production Cloud Run-Rate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="budget-amount" className="text-xs font-semibold text-foreground">
                Target Limit ($ USD)
              </label>
              <input
                id="budget-amount"
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="2500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="budget-period" className="text-xs font-semibold text-foreground">
                Period
              </label>
              <select
                id="budget-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold-slider" className="text-xs font-semibold text-foreground">
                Alert Threshold
              </label>
              <span className="text-xs font-mono font-medium text-amber-500">{alertThreshold}%</span>
            </div>
            <input
              id="threshold-slider"
              type="range"
              min="50"
              max="95"
              step="5"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Notify team when actual spend reaches {alertThreshold}% of budget limit.
            </p>
          </div>

          {createMutation.isError && (
            <p className="text-xs text-destructive">
              {createMutation.error?.message || 'Failed to create budget'}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || !amount || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Create Budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
