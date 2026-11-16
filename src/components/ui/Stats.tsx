/* Data display: stat cards, horizontal bars and product avatars. */
import { useState, type ReactNode } from 'react';
import { imgUrl } from '@/data/images';
import { cn } from '@/lib/cn';
import { Star } from './Icon';
import { Tooltip } from './Tooltip';

/** Stat card. `featured` is the inverted highlight card; `tip` explains how the number is made. */
export function Kpi({
  label,
  value,
  children,
  featured,
  negative,
  tip,
  className,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
  featured?: boolean;
  negative?: boolean;
  tip?: ReactNode;
  className?: string;
}) {
  const card = (
    <div
      data-kpi={label}
      className={cn(
        'relative flex h-full min-w-0 flex-col gap-1 overflow-hidden rounded-md border p-5 shadow-sm max-sm:p-4',
        featured ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface',
      )}
    >
      {featured && <Star className="absolute top-5 right-5 size-5 fill-on-accent opacity-85" />}
      <span className={cn('text-sm font-medium', featured ? 'text-on-accent-muted' : 'text-fg-muted')}>{label}</span>
      <b
        className={cn(
          'truncate font-bold tracking-tight tabular-nums',
          featured ? 'text-3xl max-sm:text-2xl' : 'text-2xl max-sm:text-xl',
          negative && (featured ? 'text-on-accent-danger' : 'text-danger'),
        )}
      >
        {value}
      </b>
      <div className={cn('flex flex-col gap-0.5 text-xs', featured ? 'text-on-accent-muted' : 'text-fg-subtle')}>{children}</div>
    </div>
  );
  if (!tip) return <div className={cn('min-w-0', className)}>{card}</div>;
  return (
    <Tooltip content={tip} className={cn('min-w-0 rounded-md', className)}>
      {card}
    </Tooltip>
  );
}

/** Horizontal bar row: label, bar (0–1) and value. */
export function HBar({
  label,
  ratio,
  value,
  variant = 'primary',
  negative,
}: {
  label: ReactNode;
  ratio: number;
  value: ReactNode;
  variant?: 'primary' | 'secondary';
  negative?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] items-center gap-3.5 py-2 text-sm max-sm:grid-cols-[minmax(0,1fr)_1fr_auto]">
      <div className="min-w-0">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
        <div
          className={cn('h-full rounded-full', variant === 'primary' ? 'bg-chart-1' : 'bg-chart-2')}
          style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
        />
      </div>
      <span className={cn('min-w-[3ch] text-right font-semibold tabular-nums', negative && 'text-danger')}>{value}</span>
    </div>
  );
}

/** Product artwork, or its initial when there is no image (or it fails to load). */
export function Avatar({
  name,
  image,
  shape = 'round',
  size = 'md',
}: {
  name?: string;
  image?: string;
  shape?: 'round' | 'square';
  size?: 'sm' | 'md';
}) {
  const [broken, setBroken] = useState(false);
  const src = imgUrl(image);
  return (
    <div
      data-avatar
      className={cn(
        'grid flex-none place-items-center overflow-hidden bg-surface-muted font-bold text-fg shadow-[0_0_0_1px_var(--color-border)]',
        shape === 'round' ? 'rounded-full' : 'rounded-md',
        size === 'md' ? 'size-16 text-xl' : 'size-9.5 text-sm',
      )}
    >
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        (name || '?').trim().charAt(0).toUpperCase()
      )}
    </div>
  );
}
