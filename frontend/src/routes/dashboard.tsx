import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  BrainCircuit,
  CircleDollarSign,
  Cloud,
  ExternalLink,
  Gauge,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useReadinessQuery } from '@/features/system/system.queries'

export function DashboardRoute() {
  const readiness = useReadinessQuery()
  const apiReady = readiness.isSuccess
  const [connectModalOpen, setConnectModalOpen] = React.useState(false)

  return (
    <AuthGuard>
      <AppShell breadcrumbs={[{ label: 'Overview' }]}>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-8">
          {/* Welcome Section */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  Cloud Governance
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Your cloud, in focus.
              </h1>
              <p className="text-sm text-muted-foreground">
                Unified observability for multi-cloud infrastructure, AI models, and cost allocation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-xs">
                Last 30 days
              </Badge>
            </div>
          </section>

          {/* 4 Stats Cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key cloud metrics">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Cloud Resources
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                  <Boxes className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">—</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect an account to discover assets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Monthly Cloud Spend
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                  <CircleDollarSign className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">—</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Billing connector unconfigured
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  AI Workloads
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <BrainCircuit className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">—</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bedrock, SageMaker & Vertex AI
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Policy Findings
                </CardTitle>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">—</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Zero security drift detected
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Content Grid: Get Started + System Status */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Onboarding Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Get started</CardTitle>
                  <CardDescription className="text-xs">
                    Connect your cloud providers to automatically map infrastructure and AI services.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Step 01 / 03
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      <Cloud className="size-5" />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-foreground">
                        Connect a cloud provider
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        Start with read-only IAM access. No modifications are made to your infrastructure.
                      </span>
                    </div>
                  </div>

                  <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 shrink-0">
                        Connect <ArrowUpRight className="size-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Cloud className="size-5 text-primary" />
                          Connect Cloud Account
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Configure read-only credentials or cross-account IAM role delegation for automated discovery.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-2">
                        <div className="rounded-lg border border-border p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Amazon Web Services (AWS)</span>
                            <Badge variant="outline" className="text-[10px]">Recommended</Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Deploy a minimal CloudFormation stack granting read-only permissions (`arn:aws:iam::aws:policy/SecurityAudit`).
                          </p>
                        </div>

                        <div className="rounded-lg border border-border p-3 text-xs space-y-2 opacity-75">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Google Cloud Platform (GCP)</span>
                            <Badge variant="secondary" className="text-[10px]">Preview</Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Service Account with `Viewer` or fine-grained `roles/cloudasset.viewer`.
                          </p>
                        </div>

                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                          <span>
                            Cloud write operations and credentials storage are disabled until tenant authorization isolation is configured.
                          </span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Progress Bar & Steps */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Setup Progress</span>
                    <span className="font-medium text-foreground">33%</span>
                  </div>
                  <Progress value={33} />
                  <div className="grid grid-cols-3 text-center text-[11px] text-muted-foreground pt-1">
                    <span className="font-semibold text-primary">1. Connect Account</span>
                    <span>2. Discover Assets</span>
                    <span>3. Assign Ownership</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status Panel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">System Status</CardTitle>
                  <CardDescription className="text-xs">
                    Local development environment
                  </CardDescription>
                </div>
                <Activity className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-xs font-medium text-foreground">API Service</span>
                  {readiness.isPending ? (
                    <Skeleton className="h-5 w-20" />
                  ) : apiReady ? (
                    <Badge variant="success" className="gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Operational
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <span className="size-1.5 rounded-full bg-red-500" /> Unavailable
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-xs font-medium text-foreground">PostgreSQL</span>
                  {readiness.isPending ? (
                    <Skeleton className="h-5 w-20" />
                  ) : apiReady ? (
                    <Badge variant="success" className="gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <span className="size-1.5 rounded-full bg-red-500" /> Not Connected
                    </Badge>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
                  <LockKeyhole className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>Multi-tenant isolation and session authentication active.</span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Empty State / Infrastructure Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Infrastructure Inventory</CardTitle>
                <CardDescription className="text-xs">
                  Your multi-cloud resources and AI workloads appear here once synchronized.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/inventory" className="gap-1.5">
                  View inventory <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Gauge className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">No resources synchronized yet</h3>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Connect an AWS, GCP, or Azure account to populate compute, storage, databases, and AI deployments.
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setConnectModalOpen(true)}>
                  Connect Provider
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              CloudPilot Modular Monolith Foundation
            </span>
            <span>v0.1.0</span>
          </footer>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
