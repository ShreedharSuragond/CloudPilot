import { Check, ChevronDown, Plus, Building2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/use-auth'
import { useWorkspaceStore } from '@/stores/workspace.store'

export function OrgSwitcher() {
  const { memberships } = useAuth()
  const { activeOrganisationId, setActiveOrganisationId } = useWorkspaceStore()

  const organisations = memberships && memberships.length > 0
    ? memberships
    : [
        {
          organisationId: 'default-org',
          organisationName: 'Northstar Labs',
          role: 'Workspace admin',
        },
      ]

  const currentOrg =
    organisations.find((org) => org.organisationId === activeOrganisationId) ||
    organisations[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2 text-left transition hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {currentOrg.organisationName.charAt(0).toUpperCase()}
          </span>
          <span className="grid flex-1 gap-0.5 truncate text-left">
            <strong className="truncate text-xs font-semibold text-foreground">
              {currentOrg.organisationName}
            </strong>
            <small className="text-[10px] text-muted-foreground">
              {currentOrg.role}
            </small>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {organisations.map((org) => {
          const isSelected = org.organisationId === currentOrg.organisationId
          return (
            <DropdownMenuItem
              key={org.organisationId}
              onClick={() => setActiveOrganisationId(org.organisationId)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="truncate text-xs font-medium">
                  {org.organisationName}
                </span>
              </div>
              {isSelected && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-xs text-primary"
          onClick={() => {}}
        >
          <Plus className="size-3.5" />
          <span>New Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
