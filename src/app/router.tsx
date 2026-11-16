/* Routes (TanStack Router). Each screen is its own route and its own file, loaded on demand.
   Filters live in the address (?status=enviado), validated with Zod, so a filtered view can be
   bookmarked and the back button works. Hash history keeps the site fully static. */
import { createHashHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { Shell } from './Shell';

const month = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .catch(undefined);

const rootRoute = createRootRoute({ component: Shell });

const overviewSearch = z.object({ mes: month, rank: z.enum(['lucro', 'pecas']).optional().catch(undefined) });
const tasksSearch = z.object({
  filtro: z.enum(['pendentes', 'feitas', 'todas']).optional().catch(undefined),
  etiqueta: z.string().optional().catch(undefined),
});
const ordersSearch = z.object({ status: z.string().optional().catch(undefined), canal: z.string().optional().catch(undefined) });
const catalogSearch = z.object({ fila: z.boolean().optional().catch(undefined) });
const expensesSearch = z.object({
  mes: z
    .union([z.literal('todos'), month])
    .optional()
    .catch(undefined),
});

export type OverviewSearch = z.infer<typeof overviewSearch>;
export type TasksSearch = z.infer<typeof tasksSearch>;
export type OrdersSearch = z.infer<typeof ordersSearch>;
export type CatalogSearch = z.infer<typeof catalogSearch>;
export type ExpensesSearch = z.infer<typeof expensesSearch>;

/** A screen without filters in the address. */
const screen = <P extends string>(path: P, load: () => Promise<{ default: () => ReactNode }>) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: lazyRouteComponent(load) });

export const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: overviewSearch,
  component: lazyRouteComponent(() => import('@/features/overview/OverviewPage')),
});
export const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tarefas',
  validateSearch: tasksSearch,
  component: lazyRouteComponent(() => import('@/features/tasks/TasksPage')),
});
export const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedidos',
  validateSearch: ordersSearch,
  component: lazyRouteComponent(() => import('@/features/orders/OrdersPage')),
});
export const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalogo',
  validateSearch: catalogSearch,
  component: lazyRouteComponent(() => import('@/features/catalog/CatalogPage')),
});
export const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gastos',
  validateSearch: expensesSearch,
  component: lazyRouteComponent(() => import('@/features/expenses/ExpensesPage')),
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  tasksRoute,
  ordersRoute,
  catalogRoute,
  expensesRoute,
  screen('/precos', () => import('@/features/pricing/PricingPage')),
  screen('/producao', () => import('@/features/production/ProductionPage')),
  screen('/insumos', () => import('@/features/supplies/SuppliesPage')),
  screen('/ajustes', () => import('@/features/settings/SettingsPage')),
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  scrollRestoration: true,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
