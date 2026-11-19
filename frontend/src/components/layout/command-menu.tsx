import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Boxes,
  BrainCircuit,
  CircleDollarSign,
  Cloud,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useLogoutMutation } from '@/features/auth/auth.mutations'

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate()
  const logout = useLogoutMutation()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search cloud resources..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/dashboard' }))}
          >
            <LayoutDashboard className="mr-2 size-4 text-indigo-500" />
            <span>Overview Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/inventory' }))}
          >
            <Cloud className="mr-2 size-4 text-sky-500" />
            <span>Cloud Inventory</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/dashboard' }))}
          >
            <BrainCircuit className="mr-2 size-4 text-amber-500" />
            <span>AI Workloads</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/dashboard' }))}
          >
            <CircleDollarSign className="mr-2 size-4 text-violet-500" />
            <span>Cost Management</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/dashboard' }))}
          >
            <ShieldCheck className="mr-2 size-4 text-emerald-500" />
            <span>Policies & Governance</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/dashboard' }))}
          >
            <Users className="mr-2 size-4 text-rose-500" />
            <span>Teams & Ownership</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Cloud Resources">
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/inventory' }))}
          >
            <Boxes className="mr-2 size-4 text-muted-foreground" />
            <span>EC2 Compute Clusters</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/inventory' }))}
          >
            <Boxes className="mr-2 size-4 text-muted-foreground" />
            <span>S3 Object Storage Buckets</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: '/inventory' }))}
          >
            <BrainCircuit className="mr-2 size-4 text-muted-foreground" />
            <span>Bedrock Foundation Models</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Account & System">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Settings className="mr-2 size-4 text-muted-foreground" />
            <span>Workspace Settings</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                logout.mutate()
              })
            }
          >
            <LogOut className="mr-2 size-4 text-destructive" />
            <span className="text-destructive">Log Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
