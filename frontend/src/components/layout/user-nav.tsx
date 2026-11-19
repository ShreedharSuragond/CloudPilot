import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/use-auth'
import { useLogoutMutation } from '@/features/auth/auth.mutations'

export function UserNav() {
  const { user } = useAuth()
  const logout = useLogoutMutation()

  const userName = user?.name || 'Jordan Davis'
  const userEmail = user?.email || 'jordan.davis@cloudpilot.dev'
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-transparent p-1.5 transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-amber-100 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-0.5 text-left truncate">
            <strong className="truncate text-xs font-semibold text-foreground">
              {userName}
            </strong>
            <small className="truncate text-[10px] text-muted-foreground">
              {userEmail}
            </small>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-semibold text-foreground">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2 text-xs">
            <User className="size-3.5" />
            <span>Profile & Security</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs">
            <Settings className="size-3.5" />
            <span>Preferences</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault()
            logout.mutate()
          }}
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-3.5" />
          <span>{logout.isPending ? 'Logging out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
