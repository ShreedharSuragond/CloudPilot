import * as React from 'react'
import { Bell, Menu, Search } from 'lucide-react'
import { CommandMenu } from '@/components/layout/command-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/use-auth'
import { useUIStore } from '@/stores/ui.store'

interface HeaderProps {
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function Header({ breadcrumbs }: HeaderProps) {
  const [commandOpen, setCommandOpen] = React.useState(false)
  const { toggleSidebar } = useUIStore()
  const { user } = useAuth()

  const userName = user?.name || 'Jordan Davis'
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent md:hidden cursor-pointer"
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <span>Workspace</span>
            <span className="text-border">/</span>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label}>
                  <strong className="font-semibold text-foreground">{crumb.label}</strong>
                  {idx < breadcrumbs.length - 1 && <span className="text-border">/</span>}
                </React.Fragment>
              ))
            ) : (
              <strong className="font-semibold text-foreground">Overview</strong>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex h-9 w-48 sm:w-64 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-xs text-muted-foreground transition hover:border-ring/50 hover:bg-muted cursor-pointer"
          >
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate">Search resources...</span>
            <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ⌘ K
            </kbd>
          </button>

          <button
            type="button"
            className="relative grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground cursor-pointer"
            aria-label="View notifications"
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>

          <Avatar className="size-8">
            <AvatarFallback className="bg-amber-100 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
