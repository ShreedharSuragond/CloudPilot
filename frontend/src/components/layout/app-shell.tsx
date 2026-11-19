import * as React from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

interface AppShellProps {
  children: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
