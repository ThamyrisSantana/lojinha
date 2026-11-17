/* Routes (TanStack Router). Each screen is its own route and its own file, loaded on demand.
   Filters live in the address (?status=enviado), validated with Zod, so a filtered view can be
   bookmarked and the back button works. Hash history keeps the site fully static. */
import { createHashHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { Shell } from './Shell';
import { TABS, type TabKey } from './tabs';

// Addresses of the previous version (#pedidos) still open the right screen (#/pedidos).
const legacy = /^#([a-z]+)$/.exec(location.hash)?.[1];
if (legacy && legacy in TABS) history.replaceState(null, '', '#' + TABS[legacy as TabKey].path);

/** Optional filter that falls back to "not set" when the address has an invalid value. */
const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);
const month = z.string().regex(/^\d{4}-\d{2}$/);

const rootRoute = createRootRoute({
  component: Shell,
  // Unknown addresses (old links, a password-reset link's leftovers) go to the overview.
  notFoundComponent: () => <Navigate to="/" replace />,
});

/** A screen without filters in the address. */
const screen = <P extends string>(path: P, load: () => Promise<{ default: () => ReactNode }>) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: lazyRouteComponent(load) });

// Screens with filters are declared one by one so TanStack Router can type their search params.
const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: z.object({ mes: optional(month), rank: optional(z.enum(['lucro', 'pecas'])) }),
  component: lazyRouteComponent(() => import('@/features/overview/OverviewPage')),
});
const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tarefas',
  validateSearch: z.object({ filtro: optional(z.enum(['pendentes', 'feitas', 'todas'])), etiqueta: optional(z.string()) }),
  component: lazyRouteComponent(() => import('@/features/tasks/TasksPage')),
});
const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedidos',
  validateSearch: z.object({ status: optional(z.string()), canal: optional(z.string()) }),
  component: lazyRouteComponent(() => import('@/features/orders/OrdersPage')),
});
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalogo',
  validateSearch: z.object({ fila: optional(z.boolean()) }),
  component: lazyRouteComponent(() => import('@/features/catalog/CatalogPage')),
});
const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gastos',
  validateSearch: z.object({ mes: optional(z.union([z.literal('todos'), month])) }),
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
