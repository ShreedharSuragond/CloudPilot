import * as React from 'react'
import {
  Loader2,
  Workflow,
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
import { useCreateIntegrationMutation } from './integrations.mutations'

interface CreateIntegrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AVAILABLE_EVENTS = [
  { id: 'policy.critical', label: 'Critical Policy Violations' },
  { id: 'policy.high', label: 'High Severity Security Findings' },
  { id: 'cost.anomaly', label: 'FinOps Cost Spike Alerts' },
  { id: 'account.sync', label: 'Cloud Discovery Sync Errors' },
]

export function CreateIntegrationModal({ open, onOpenChange }: CreateIntegrationModalProps) {
  const [name, setName] = React.useState('')
  const [provider, setProvider] = React.useState('slack')
  const [webhookUrl, setWebhookUrl] = React.useState('')
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([
    'policy.critical',
    'policy.high',
    'cost.anomaly',
  ])

  const createMutation = useCreateIntegrationMutation()

  const handleToggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !webhookUrl.trim() || createMutation.isPending) return

    createMutation.mutate(
      {
        name: name.trim(),
        provider,
        webhookUrl: webhookUrl.trim(),
        events: selectedEvents,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setName('')
          setProvider('slack')
          setWebhookUrl('')
          setSelectedEvents(['policy.critical', 'policy.high', 'cost.anomaly'])
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Workflow className="size-5 text-primary" />
            Add Alert Integration Webhook
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Stream real-time security guardrail alerts and cost anomalies to Slack, Teams, or custom endpoints.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="integration-name" className="text-xs font-semibold text-foreground">
              Integration Name
            </label>
            <input
              id="integration-name"
              type="text"
              required
              placeholder="e.g. #security-alerts-prod"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="integration-provider" className="text-xs font-semibold text-foreground">
              Platform Provider
            </label>
            <select
              id="integration-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="slack">Slack Incoming Webhook</option>
              <option value="teams">Microsoft Teams Webhook</option>
              <option value="discord">Discord Webhook</option>
              <option value="webhook">Generic HTTPS Webhook</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="integration-url" className="text-xs font-semibold text-foreground">
              Webhook URL
            </label>
            <input
              id="integration-url"
              type="url"
              required
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Subscribed Event Triggers</label>
            <div className="space-y-1.5">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event.id}
                  className="flex items-center gap-2 rounded-md border border-border p-2 text-xs cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => handleToggleEvent(event.id)}
                    className="rounded border-input text-primary focus:ring-primary size-3.5"
                  />
                  <span className="font-medium text-foreground">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-xs text-destructive">
              {createMutation.error?.message || 'Failed to save integration'}
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
              disabled={!name.trim() || !webhookUrl.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Save Integration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
