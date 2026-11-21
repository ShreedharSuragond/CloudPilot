import * as React from 'react'
import { Building2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateOrganisationMutation } from './organisation.mutations'

interface CreateOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps) {
  const [name, setName] = React.useState('')
  const createMutation = useCreateOrganisationMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          onOpenChange(false)
          setName('')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-primary" />
            Create Workspace
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an isolated multi-cloud governance workspace for your team or enterprise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="workspace-name" className="text-xs font-semibold text-foreground">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              required
              placeholder="e.g. Acme Cloud Operations"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>

          {createMutation.isError && (
            <p className="text-xs text-destructive">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed to create workspace'}
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
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
