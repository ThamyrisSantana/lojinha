import type { IconName } from '@/components/ui/Icon';

export interface Tab {
  path: string;
  label: string;
  icon: IconName;
}

export const TABS = {
  visao: { path: '/', label: 'Visão geral', icon: 'visao' },
  tarefas: { path: '/tarefas', label: 'Tarefas', icon: 'tarefas' },
  pedidos: { path: '/pedidos', label: 'Pedidos', icon: 'pedidos' },
  catalogo: { path: '/catalogo', label: 'Catálogo', icon: 'catalogo' },
  preco: { path: '/precos', label: 'Preços', icon: 'preco' },
  producao: { path: '/producao', label: 'Produção', icon: 'producao' },
  insumos: { path: '/insumos', label: 'Insumos', icon: 'insumos' },
  gastos: { path: '/gastos', label: 'Gastos', icon: 'gastos' },
  ajustes: { path: '/ajustes', label: 'Ajustes', icon: 'ajustes' },
} satisfies Record<string, Tab>;
export type TabKey = keyof typeof TABS;

// The sidebar groups the screens by topic; the phone's bottom bar shows only the most used.
export const NAV_GROUPS: [string, TabKey[]][] = [
  ['Dia a dia', ['visao', 'tarefas', 'pedidos']],
  ['Produtos', ['catalogo', 'preco', 'producao']],
  ['Estoque e dinheiro', ['insumos', 'gastos']],
  ['', ['ajustes']],
];
export const BOTTOM_NAV: TabKey[] = ['visao', 'pedidos', 'tarefas', 'catalogo'];

export const tabByPath = (path: string): Tab => Object.values(TABS).find(t => t.path === path) ?? TABS.visao;
