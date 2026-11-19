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
  { label: 'AI workloads', to: '/dashboard', icon: BrainCircuit, hash: '#ai-workloads' },
  { label: 'Cost management', to: '/dashboard', icon: CircleDollarSign, hash: '#costs' },
  { label: 'Policies & Governance', to: '/dashboard', icon: ShieldCheck, hash: '#policies' },
  { label: 'Teams & ownership', to: '/dashboard', icon: Users, hash: '#teams' },
]

const adminNavItems = [
  { label: 'Integrations', to: '/dashboard', icon: Workflow, hash: '#integrations' },
  { label: 'Settings', to: '/dashboard', icon: Settings2, hash: '#settings' },
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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card p-4 transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-2 pb-5 pt-1">
          <Link to="/dashboard" className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Command size={18} />
            </div>
            <span className="tracking-tight">cloudpilot</span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="mb-6">
          <OrgSwitcher />
        </div>

        {/* Main Nav */}
        <div className="mb-2 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Workspace
        </div>
        <nav className="space-y-1" aria-label="Main navigation">
          {mainNavItems.map((item) => {
            const isActive = currentPath === item.to && (!item.hash || window.location.hash === item.hash)
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.to}
                hash={item.hash}
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

        {/* Bottom Section */}
        <div className="mt-auto pt-6">
          <div className="mb-2 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Administration
          </div>
          <nav className="space-y-1 mb-4" aria-label="Admin navigation">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  hash={item.hash}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border pt-3">
            <UserNav />
          </div>
        </div>
      </aside>
    </>
  )
}
