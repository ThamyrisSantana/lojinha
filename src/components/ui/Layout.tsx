/* Page structure: page header, panels, empty states and notes. */
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Page header: title, description, actions on the right. The title takes focus when the page opens. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  // After choosing a screen in the menu, moving focus to the title tells keyboard and
  // screen-reader users the screen changed (on first load focus stays at the top of the page).
  useEffect(() => {
    if (document.activeElement?.closest('nav')) h1.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-[1_1_380px] max-sm:basis-full">
        {eyebrow && <p className="mb-1.5 text-sm font-semibold text-fg-subtle">{eyebrow}</p>}
        <h1 ref={h1} tabIndex={-1} className="text-3xl/tight font-bold tracking-tighter max-lg:text-2xl [&_em]:not-italic">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-readable text-fg-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Card with a heading; `aside` sits on the right of the heading. */
export function Panel({
  title,
  aside,
  className,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('relative min-w-0 rounded-md border border-border bg-surface p-6 shadow-sm', className)}>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg/snug font-bold tracking-tight">
        {title}
        {aside}
      </h2>
      {children}
    </section>
  );
}

/** Secondary text on the right of a panel heading. */
export const HeadingNote = ({ children }: { children: ReactNode }) => (
  <small className="ml-auto text-xs font-medium tracking-normal text-fg-subtle">{children}</small>
);

export function EmptyState({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-md border-[1.5px] border-dashed border-border-strong bg-surface px-5 py-12 text-center text-fg-muted">
      <b className="text-lg/snug font-bold tracking-tight text-fg">{title}</b>
      <span className="max-w-[52ch]">{children}</span>
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function Note({ tone, children }: { tone?: 'warn'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-sm border border-border bg-surface px-4 py-3 text-sm text-fg-muted',
        tone === 'warn' && 'border-l-3 border-l-warning text-fg',
      )}
    >
      {children}
    </div>
  );
}

/** Small gray text under a name or value. */
export const Sub = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('text-xs text-fg-subtle', className)}>{children}</div>
);

/** Text only screen readers read. */
export const SrOnly = ({ children }: { children: ReactNode }) => <span className="sr-only">{children}</span>;
