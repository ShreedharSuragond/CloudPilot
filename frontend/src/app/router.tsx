import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { RootIndexRoute } from '../routes/index'
import { DashboardRoute } from '../routes/dashboard'
import { InventoryRoute } from '../routes/inventory'
import { LoginRoute } from '../routes/login'
import { TeamsRoute } from '../routes/teams'
import { PoliciesRoute } from '../routes/policies'
import { CostsRoute } from '../routes/costs'
import { AIWorkloadsRoute } from '../routes/ai-workloads'
import { SettingsRoute } from '../routes/settings'
import { IntegrationsRoute } from '../routes/integrations'

const rootRoute = createRootRoute({ component: Outlet })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RootIndexRoute,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardRoute,
})

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: InventoryRoute,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRoute,
})

const teamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teams',
  component: TeamsRoute,
})

const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policies',
  component: PoliciesRoute,
})

const costsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/costs',
  component: CostsRoute,
})

const aiWorkloadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-workloads',
  component: AIWorkloadsRoute,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRoute,
})

const integrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/integrations',
  component: IntegrationsRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  inventoryRoute,
  loginRoute,
  teamsRoute,
  policiesRoute,
  costsRoute,
  aiWorkloadsRoute,
  settingsRoute,
  integrationsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
