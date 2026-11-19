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
  ShieldCheck,
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

interface CloudResource {
  id: string
  name: string
  provider: 'aws' | 'gcp' | 'azure'
  service: string
  type: 'compute' | 'storage' | 'database' | 'ai'
  region: string
  status: 'running' | 'active' | 'stopped' | 'idle'
  monthlyCost: string
  compliance: 'compliant' | 'review' | 'violation'
}

const sampleResources: CloudResource[] = [
  {
    id: 'res-01',
    name: 'prod-api-cluster-us-east',
    provider: 'aws',
    service: 'Amazon EKS',
    type: 'compute',
    region: 'us-east-1',
    status: 'running',
    monthlyCost: '$148.50',
    compliance: 'compliant',
  },
  {
    id: 'res-02',
    name: 'anthropic.claude-3-5-sonnet',
    provider: 'aws',
    service: 'Amazon Bedrock',
    type: 'ai',
    region: 'us-east-1',
    status: 'active',
    monthlyCost: '$412.30',
    compliance: 'compliant',
  },
  {
    id: 'res-03',
    name: 'customer-data-lake-raw',
    provider: 'aws',
    service: 'Amazon S3',
    type: 'storage',
    region: 'us-east-1',
    status: 'active',
    monthlyCost: '$84.10',
    compliance: 'compliant',
  },
  {
    id: 'res-04',
    name: 'cloudpilot-postgres-primary',
    provider: 'aws',
    service: 'Amazon RDS',
    type: 'database',
    region: 'us-east-1',
    status: 'running',
    monthlyCost: '$210.00',
    compliance: 'compliant',
  },
  {
    id: 'res-05',
    name: 'gemini-1.5-pro-endpoint',
    provider: 'gcp',
    service: 'Vertex AI',
    type: 'ai',
    region: 'us-central1',
    status: 'active',
    monthlyCost: '$318.00',
    compliance: 'compliant',
  },
  {
    id: 'res-06',
    name: 'analytics-backup-archive',
    provider: 'gcp',
    service: 'Cloud Storage',
    type: 'storage',
    region: 'us-central1',
    status: 'idle',
    monthlyCost: '$19.40',
    compliance: 'review',
  },
]

export function InventoryRoute() {
  const [search, setSearch] = React.useState('')
  const [activeTab, setActiveTab] = React.useState('all')

  const filteredResources = sampleResources.filter((res) => {
    const matchesSearch =
      res.name.toLowerCase().includes(search.toLowerCase()) ||
      res.service.toLowerCase().includes(search.toLowerCase()) ||
      res.region.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (activeTab === 'all') return true
    if (activeTab === 'ai') return res.type === 'ai'
    if (activeTab === 'compute') return res.type === 'compute'
    if (activeTab === 'storage') return res.type === 'storage' || res.type === 'database'
    return res.provider === activeTab
  })

  const getServiceIcon = (type: CloudResource['type']) => {
    switch (type) {
      case 'compute':
        return <Server className="size-4 text-sky-500" />
      case 'storage':
        return <HardDrive className="size-4 text-violet-500" />
      case 'database':
        return <Database className="size-4 text-emerald-500" />
      case 'ai':
        return <BrainCircuit className="size-4 text-amber-500" />
      default:
        return <Boxes className="size-4 text-muted-foreground" />
    }
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
              Automated resource catalog across multi-cloud accounts and AI endpoints.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="size-3.5" /> Export
            </Button>
            <Button size="sm" className="gap-1.5">
              <RefreshCw className="size-3.5" /> Sync Accounts
            </Button>
          </div>
        </div>

        {/* Filter bar */}
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
                  <TabsTrigger value="all">All ({sampleResources.length})</TabsTrigger>
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
                  <TableHead>Governance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Filter className="size-5 text-muted-foreground/60" />
                        <span className="text-sm font-medium">No resources match the filter</span>
                        <span className="text-xs">Try adjusting your search criteria</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResources.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 place-items-center rounded-lg bg-muted">
                            {getServiceIcon(res.type)}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-foreground block">
                              {res.name}
                            </span>
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
                      <TableCell className="text-xs font-medium text-foreground">
                        {res.monthlyCost}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={res.compliance === 'compliant' ? 'outline' : 'warning'}
                          className="gap-1 text-[10px]"
                        >
                          <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                          {res.compliance}
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
