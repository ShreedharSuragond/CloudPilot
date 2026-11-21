import { Link, useRouterState } from '@tanstack/react-router'
import {
  BrainCircuit,
  CircleDollarSign,
  Cloud,
  Command,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from 'lucide-react'
import { OrgSwitcher } from '@/components/layout/org-switcher'
import { UserNav } from '@/components/layout/user-nav'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils'

const mainNavItems = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Cloud inventory', to: '/inventory', icon: Cloud },
  { label: 'AI workloads', to: '/ai-workloads', icon: BrainCircuit },
  { label: 'Cost management', to: '/costs', icon: CircleDollarSign },
  { label: 'Policies & Governance', to: '/policies', icon: ShieldCheck },
  { label: 'Teams & ownership', to: '/teams', icon: Users },
]

const adminNavItems = [
  { label: 'Integrations', to: '/integrations', icon: Workflow },
  { label: 'Settings', to: '/settings', icon: Settings2 },
]

export function Sidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card p-4 transition-transform duration-200 ease-in-out md:static md:translate-x-0 h-full shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand & Workspace Switcher (Fixed Header of Sidebar) */}
        <div className="shrink-0 space-y-4 pb-2">
          <div className="flex items-center justify-between px-2 pt-1">
            <Link to="/dashboard" className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Command size={18} />
              </div>
              <span className="tracking-tight">cloudpilot</span>
            </Link>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden cursor-pointer"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <OrgSwitcher />
          </div>
        </div>

        {/* Main Navigation (Scrollable internally if screen is short, never expands sidebar) */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 -mx-1 px-1">
          <div className="mb-2 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Workspace
          </div>
          <nav className="space-y-1" aria-label="Main navigation">
            {mainNavItems.map((item) => {
              const isActive = currentPath === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section (Pinned at bottom, never stretches down with page content) */}
        <div className="shrink-0 pt-3 border-t border-border mt-auto">
          <div className="mb-2 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Administration
          </div>
          <nav className="space-y-1 mb-3" aria-label="Admin navigation">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.to
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border/60 pt-3">
            <UserNav />
          </div>
        </div>
      </aside>
    </>
  )
}
