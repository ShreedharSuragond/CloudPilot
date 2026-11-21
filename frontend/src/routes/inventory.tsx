import * as React from 'react'
import {
  Boxes,
  BrainCircuit,
  Database,
  Download,
  Filter,
  HardDrive,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useInventoryQuery } from '@/features/dashboard/dashboard.queries'

export function InventoryRoute() {
  const [search, setSearch] = React.useState('')
  const [activeTab, setActiveTab] = React.useState('all')

  const { data: resources, isPending, refetch, isRefetching } = useInventoryQuery()

  const isAiResource = (res: any) =>
    res.resourceType === 'ai_model' || res.resourceType === 'ai_endpoint' || Boolean(res.isAiWorkload)

  const filteredResources = (resources ?? []).filter((res) => {
    const matchesSearch =
      res.name.toLowerCase().includes(search.toLowerCase()) ||
      res.service.toLowerCase().includes(search.toLowerCase()) ||
      res.region.toLowerCase().includes(search.toLowerCase()) ||
      res.provider.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (activeTab === 'all') return true
    if (activeTab === 'ai') return isAiResource(res)
    if (activeTab === 'compute') return res.resourceType === 'compute'
    if (activeTab === 'storage') return res.resourceType === 'storage' || res.resourceType === 'database'
    return res.provider.toLowerCase() === activeTab.toLowerCase()
  })

  const getServiceIcon = (resourceType: string, isAi: boolean) => {
    if (isAi || resourceType === 'ai_model' || resourceType === 'ai_endpoint') {
      return <BrainCircuit className="size-4 text-amber-500" />
    }
    switch (resourceType) {
      case 'compute':
        return <Server className="size-4 text-sky-500" />
      case 'storage':
        return <HardDrive className="size-4 text-violet-500" />
      case 'database':
        return <Database className="size-4 text-emerald-500" />
      default:
        return <Boxes className="size-4 text-muted-foreground" />
    }
  }

  const exportCSV = () => {
    if (!resources || resources.length === 0) return
    const headers = ['ID', 'Name', 'Provider', 'Service', 'ResourceType', 'Region', 'Status', 'MonthlyCost', 'IsAI']
    const rows = resources.map((r) => [
      r.id,
      r.name,
      r.provider,
      r.service,
      r.resourceType,
      r.region,
      r.status,
      (r.monthlyCost ?? 0).toFixed(2),
      isAiResource(r) ? 'true' : 'false',
    ])
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `cloudpilot_inventory_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Cloud Inventory' }]}>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Cloud Inventory
              </h1>
              <p className="text-sm text-muted-foreground">
                Automated catalog across multi-cloud infrastructure and foundation models.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={exportCSV}
                disabled={!resources || resources.length === 0}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => refetch()}
                disabled={isRefetching || isPending}
              >
                <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                {isRefetching ? 'Syncing...' : 'Sync Inventory'}
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by name, service, or region..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">
                      All ({resources?.length ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="ai">AI Workloads</TabsTrigger>
                    <TabsTrigger value="compute">Compute</TabsTrigger>
                    <TabsTrigger value="storage">Storage & DB</TabsTrigger>
                    <TabsTrigger value="aws">AWS</TabsTrigger>
                    <TabsTrigger value="gcp">GCP</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Provider & Service</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Monthly Cost</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredResources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Filter className="size-5 text-muted-foreground/60" />
                          <span className="text-sm font-medium">No cloud resources match your filter</span>
                          <span className="text-xs">Adjust search keywords or connect another cloud provider.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResources.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid size-8 place-items-center rounded-lg bg-muted">
                              {getServiceIcon(res.resourceType, isAiResource(res))}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-foreground block">
                                  {res.name}
                                </span>
                                {isAiResource(res) && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800">
                                    AI Workload
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {res.id}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground block">
                              {res.service}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {res.provider}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {res.region}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={res.status === 'running' || res.status === 'active' ? 'success' : 'secondary'}
                            className="text-[10px] capitalize"
                          >
                            {res.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground font-mono">
                          ${(res.monthlyCost ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {(res.resourceType || 'infra').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
