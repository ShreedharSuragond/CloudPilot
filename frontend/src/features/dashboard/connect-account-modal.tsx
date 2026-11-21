import * as React from 'react'
import { Cloud, Loader2, ShieldCheck } from 'lucide-react'
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
import { useConnectAccountMutation } from './dashboard.mutations'

interface ConnectAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectAccountModal({ open, onOpenChange }: ConnectAccountModalProps) {
  const [provider, setProvider] = React.useState<'aws' | 'gcp' | 'azure'>('aws')
  const [name, setName] = React.useState('')
  const [accountIdentifier, setAccountIdentifier] = React.useState('')
  const [roleArn, setRoleArn] = React.useState('')
  const connectMutation = useConnectAccountMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !accountIdentifier.trim()) return

    connectMutation.mutate(
      {
        provider,
        name: name.trim(),
        accountIdentifier: accountIdentifier.trim(),
        roleArn: provider === 'aws' ? roleArn.trim() || undefined : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setName('')
          setAccountIdentifier('')
          setRoleArn('')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="size-5 text-primary" />
            Connect Cloud Account
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add read-only IAM access or project credentials for autonomous multi-cloud discovery and AI workload tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Cloud Provider</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('aws')}
                className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  provider === 'aws'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold">AWS</span>
                  {provider === 'aws' && <Badge variant="default" className="text-[9px] px-1 py-0">Active</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground">IAM Delegation</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('gcp')}
                className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  provider === 'gcp'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold">Google Cloud</span>
                  {provider === 'gcp' && <Badge variant="default" className="text-[9px] px-1 py-0">Active</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground">Service Account</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('azure')}
                className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  provider === 'azure'
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold">Microsoft Azure</span>
                  {provider === 'azure' && <Badge variant="default" className="text-[9px] px-1 py-0">Active</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground">Subscription</span>
              </button>
            </div>
          </div>

          {/* Account Friendly Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Account Alias / Display Name</label>
            <input
              type="text"
              required
              placeholder={
                provider === 'aws'
                  ? 'e.g. Production AWS Core'
                  : provider === 'gcp'
                  ? 'e.g. Data & ML Core GCP'
                  : 'e.g. Enterprise Azure OpenAI Sub'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Account ID / Project ID */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {provider === 'aws'
                ? 'AWS Account ID (12 digits)'
                : provider === 'gcp'
                ? 'GCP Project ID'
                : 'Azure Subscription ID'}
            </label>
            <input
              type="text"
              required
              placeholder={
                provider === 'aws'
                  ? '123456789012'
                  : provider === 'gcp'
                  ? 'my-gcp-ai-project'
                  : 'sub-8849-01f2-98ab'
              }
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
            />
          </div>

          {/* Role ARN for AWS */}
          {provider === 'aws' && (
            <div className="space-y-1.5 rounded-lg border border-border p-3 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ShieldCheck className="size-4 text-emerald-500" />
                Cross-Account Trust Role ARN
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deploy the CloudPilot IAM trust policy into your AWS account and paste the resulting Role ARN below.
              </p>
              <input
                type="text"
                placeholder="arn:aws:iam::123456789012:role/CloudPilotAuditRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
              />
            </div>
          )}

          {connectMutation.isError && (
            <div className="text-xs text-destructive">
              {connectMutation.error instanceof Error
                ? connectMutation.error.message
                : 'Failed to connect account'}
            </div>
          )}

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
              size="sm"
              disabled={!name.trim() || !accountIdentifier.trim() || connectMutation.isPending}
            >
              {connectMutation.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Connect & Scan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
