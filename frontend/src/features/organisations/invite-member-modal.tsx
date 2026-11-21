import * as React from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useInviteMemberMutation } from './organisation.mutations'

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberModal({ open, onOpenChange }: InviteMemberModalProps) {
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'owner' | 'admin' | 'member' | 'viewer'>('member')
  const inviteMutation = useInviteMemberMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return

    inviteMutation.mutate(
      { email: email.trim().toLowerCase(), role },
      {
        onSuccess: () => {
          onOpenChange(false)
          setEmail('')
          setRole('member')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-5 text-primary" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite a colleague to collaborate in this workspace with role-based access control.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-xs font-semibold text-foreground">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              required
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-role" className="text-xs font-semibold text-foreground">
              Role & Permissions
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'owner' | 'admin' | 'member' | 'viewer')}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="viewer">Viewer (Read-only observability & dashboards)</option>
              <option value="member">Member (Can inspect findings & run Copilot queries)</option>
              <option value="admin">Admin (Can manage cloud accounts & invite members)</option>
              <option value="owner">Owner (Full workspace administrative ownership)</option>
            </select>
          </div>

          {inviteMutation.isError && (
            <p className="text-xs text-destructive">
              {inviteMutation.error instanceof Error
                ? inviteMutation.error.message
                : 'Failed to send invitation'}
            </p>
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
              disabled={!email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
