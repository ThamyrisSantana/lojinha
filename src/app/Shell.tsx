/* App shell: sidebar (desktop), top bar + bottom bar (phone), and the current screen. */
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Login } from '@/auth/Login';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { Toaster } from '@/components/ui/toast';
import { isPending } from '@/domain/constants';
import { useCalc } from '@/data/queries';
import { isDemoMode, supabase } from '@/data/supabase';
import { FormHost } from '@/features/forms/FormHost';
import { cn } from '@/lib/cn';
import { BOTTOM_NAV, NAV_GROUPS, TABS, tabByPath, type TabKey } from './tabs';
import { useTheme, type ThemeChoice } from './useTheme';

export function Shell() {
  const auth = useAuth();
  if (auth.status === 'loading') return <Loading />;
  if (auth.status === 'signedOut' || auth.status === 'recovery')
    return <Login mode={auth.status === 'recovery' ? 'newPassword' : 'signIn'} />;
  return (
    <FormHost>
      <a
        href="#main"
        onClick={e => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="fixed top-2 left-2 z-70 -translate-y-[200%] rounded-sm bg-fg px-4 py-2 font-semibold text-bg focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <Suspense fallback={<Loading />}>
        <Layout />
      </Suspense>
      <Toaster />
    </FormHost>
  );
}

function Loading() {
  return (
    <main className="p-9">
      <EmptyState title="Abrindo o painel…">Carregando produtos, insumos, gastos e pedidos.</EmptyState>
    </main>
  );
}

function Layout() {
  const calc = useCalc();
  const path = useRouterState({ select: s => s.location.pathname });
  const current = tabByPath(path);
  const [menuOpen, setMenuOpen] = useState(false);
  const shop = calc.cfg().nomeLoja || 'Minha lojinha';
  const badges: Partial<Record<TabKey, number>> = {
    pedidos: calc.db.pedidos.filter(isPending).length,
    tarefas: calc.tarefasUrgentes().length,
  };

  useEffect(() => {
    document.title = `${current.label} · ${shop}`;
  }, [current, shop]);

  // Phone menu: focus its first link when it opens; Escape closes it.
  const menu = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    menu.current?.querySelector<HTMLElement>('nav a')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="grid min-h-screen grid-cols-[var(--container-sidebar)_minmax(0,1fr)] bg-[linear-gradient(to_right,var(--color-surface)_var(--container-sidebar),var(--color-bg)_var(--container-sidebar))] max-lg:block max-lg:bg-bg">
      <aside
        ref={menu}
        aria-label="Menu"
        className={cn(
          'sticky top-0 z-45 flex h-screen flex-col gap-5 overflow-y-auto border-r border-border bg-surface px-3.5 pt-6 pb-4',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:h-auto max-lg:w-[min(300px,86vw)] max-lg:border-r-0 max-lg:pt-[calc(24px+env(safe-area-inset-top,0px))] max-lg:shadow-lg max-lg:duration-250 max-lg:ease-out',
          // Closed on a phone it is also invisible, so Tab and screen readers skip its links.
          // It becomes visible at once when opening, and only after sliding out when closing.
          menuOpen ? 'max-lg:transition-transform' : 'max-lg:invisible max-lg:-translate-x-[102%] max-lg:transition-[transform,visibility]',
        )}
      >
        <Brand title={shop} subtitle="Painel da loja" />
        <nav aria-label="Seções" className="flex flex-col gap-4">
          {NAV_GROUPS.map(([group, keys]) => (
            <div key={group || 'more'} className="flex flex-col gap-0.5">
              {group && <p className="mb-1 px-3 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">{group}</p>}
              {keys.map(k => (
                <NavLink key={k} tab={k} badge={badges[k]} onNavigate={() => setMenuOpen(false)} />
              ))}
            </div>
          ))}
        </nav>
        <SidebarFooter />
      </aside>
      {menuOpen && <div className="fixed inset-0 z-44 bg-overlay lg:hidden" aria-hidden="true" onClick={() => setMenuOpen(false)} />}

      <MobileTopBar title={current.label} shop={shop} onMenu={() => setMenuOpen(o => !o)} />

      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 px-9 pt-7 pb-20 outline-none max-2xl:px-7 max-2xl:pt-6 max-lg:px-4 max-lg:pt-5 max-lg:pb-28"
      >
        {isDemoMode && (
          <div className="relative mx-auto mb-5 max-w-content rounded-sm border border-border bg-surface py-2.5 pr-3.5 pl-8 text-sm text-fg-muted before:absolute before:top-[17px] before:left-4 before:size-2 before:rounded-full before:bg-warning max-lg:mb-3.5">
            Modo demonstração: os dados ficam só neste navegador. Configure o Supabase (variáveis{' '}
            <code className="font-mono text-[0.9em]">VITE_SUPABASE_*</code>) para salvar na nuvem.
          </div>
        )}
        <div className="mx-auto flex max-w-content flex-col gap-6">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <nav
        aria-label="Atalhos"
        className="fixed inset-x-2.5 bottom-[calc(10px+env(safe-area-inset-bottom,0px))] z-30 hidden justify-around rounded-full border border-border bg-surface p-1.5 shadow-lg max-lg:flex"
      >
        {BOTTOM_NAV.map(k => (
          <NavLink key={k} tab={k} badge={badges[k]} compact />
        ))}
        <button
          type="button"
          aria-label="Abrir menu com todas as seções"
          aria-current={BOTTOM_NAV.some(k => TABS[k] === current) ? undefined : 'page'}
          onClick={() => setMenuOpen(true)}
          className={bottomItemClass}
        >
          <Icon name="menu" />
          <span>{BOTTOM_NAV.some(k => TABS[k] === current) ? 'Mais' : current.label}</span>
        </button>
      </nav>
    </div>
  );
}

const bottomItemClass =
  'relative flex flex-1 flex-col items-center gap-[3px] rounded-full px-1 py-[7px] text-2xs font-semibold text-fg-subtle aria-[current=page]:bg-fg aria-[current=page]:text-bg';

function NavLink({ tab, badge, compact, onNavigate }: { tab: TabKey; badge?: number; compact?: boolean; onNavigate?: () => void }) {
  const t = TABS[tab];
  const label = compact && tab === 'visao' ? 'Início' : t.label;
  return (
    <Link
      to={t.path}
      activeOptions={{ exact: true, includeSearch: false }}
      onClick={onNavigate}
      className={
        compact
          ? bottomItemClass
          : 'relative flex items-center gap-3 rounded-full px-3.5 py-2.5 font-medium text-fg-muted hover:bg-surface-muted hover:text-fg aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-on-accent'
      }
    >
      <Icon name={t.icon} />
      <span className={compact ? undefined : 'flex-1'}>{label}</span>
      {!!badge && (
        <span
          aria-label={`${badge} pendentes`}
          className={cn(
            'min-w-[19px] rounded-full bg-fg px-[7px] text-center text-2xs/[19px] font-bold text-bg in-aria-[current=page]:bg-bg in-aria-[current=page]:text-fg',
            compact && 'absolute top-0.5 right-[calc(50%-22px)] min-w-4 px-[5px] text-[10px]/4',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function Brand({ title, subtitle, small }: { title: string; subtitle: string; small?: boolean }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', small ? 'flex-1' : 'px-2')}>
      <Logo className={small ? 'size-8.5 rounded-sm' : 'size-10.5'} />
      <div className="min-w-0">
        <b className="block truncate text-md/tight font-bold tracking-tight">{title}</b>
        <small className="block text-xs text-fg-subtle">{subtitle}</small>
      </div>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex-none overflow-hidden rounded-md bg-logo-bg shadow-[0_0_0_1px_var(--color-border)]', className)}>
      <img src="/logo.webp" alt="" className="size-full -translate-y-[1%] scale-160 object-cover brightness-104 contrast-108 grayscale" />
    </div>
  );
}

function MobileTopBar({ title, shop, onMenu }: { title: string; shop: string; onMenu: () => void }) {
  const { isDark, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 hidden items-center gap-3 border-b border-border bg-bg/88 px-4 pt-[calc(10px+env(safe-area-inset-top,0px))] pb-2.5 backdrop-blur-md max-lg:flex">
      <IconButton icon="menu" label="Abrir menu" onClick={onMenu} />
      <Brand title={title} subtitle={shop} small />
      <IconButton icon={isDark ? 'sun' : 'moon'} label={isDark ? 'Usar tema claro' : 'Usar tema escuro'} onClick={toggle} />
    </header>
  );
}

export const THEME_OPTIONS = (short: boolean) =>
  (
    [
      ['light', 'Claro', 'sun'],
      ['dark', 'Escuro', 'moon'],
      ['auto', short ? 'Auto' : 'Automático', 'auto'],
    ] as const
  ).map(([value, label, icon]) => ({
    value: value as ThemeChoice,
    label: (
      <>
        <Icon name={icon} className={short ? 'size-3.75' : 'size-4.5'} />
        {label}
      </>
    ),
    title: value === 'auto' ? 'Segue o tema do celular ou computador' : 'Tema ' + label.toLowerCase(),
  }));

function SidebarFooter() {
  const { choice, setTheme } = useTheme();
  const auth = useAuth();
  const email = auth.status === 'signedIn' ? auth.user.email : undefined;
  return (
    <div className="mt-auto flex flex-col gap-2.5 border-t border-border px-2 pt-3.5">
      <StoreState cloud={!isDemoMode}>{isDemoMode ? 'Demonstração' : email || 'Conectado'}</StoreState>
      <Segmented
        label="Tema"
        options={THEME_OPTIONS(true)}
        value={choice}
        onChange={setTheme}
        className="flex [&>button]:flex-1 [&>button]:px-1 [&>button]:text-xs"
      />
      {supabase && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => supabase!.auth.signOut()}>
            Sair
          </Button>
        </div>
      )}
    </div>
  );
}

function StoreState({ cloud, children }: { cloud: boolean; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-fg-muted" title={cloud ? 'Dados salvos na nuvem (Supabase)' : undefined}>
      <i className={cn('size-2 flex-none rounded-full', cloud ? 'bg-success' : 'bg-warning')} />
      <span className="truncate">{children}</span>
    </div>
  );
}
