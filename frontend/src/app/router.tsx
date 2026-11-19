import { createRootRoute, createRoute, createRouter, Navigate, Outlet } from '@tanstack/react-router'
import { RootIndexRoute } from '../routes/index'
import { DashboardRoute } from '../routes/dashboard'
import { InventoryRoute } from '../routes/inventory'
import { LoginRoute } from '../routes/login'

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

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => <Navigate to="/login" replace />,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  inventoryRoute,
  loginRoute,
  registerRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
