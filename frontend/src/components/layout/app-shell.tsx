import * as React from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  className?: string
  noContainer?: boolean
}

export function AppShell({
  children,
  breadcrumbs,
  className,
  noContainer = false,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <Header breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto min-w-0">
          {noContainer ? (
            children
          ) : (
            <div className={cn('mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6', className)}>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
