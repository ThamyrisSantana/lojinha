import type { ReactNode } from 'react';
import type { Tone } from '@/domain/constants';
import { cn } from '@/lib/cn';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  good: 'bg-surface-muted text-fg',
  warn: 'bg-surface-muted text-fg',
  bad: 'bg-surface-muted text-fg',
  info: 'bg-transparent text-fg-muted shadow-[inset_0_0_0_1px_var(--color-border-strong)]',
  strong: 'bg-fg text-bg',
};
const DOTS: Partial<Record<Tone, string>> = { good: 'bg-success', warn: 'bg-warning', bad: 'bg-danger' };

/** Small tag. good/warn/bad show a colored status dot; color never carries meaning alone. */
export function Chip({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs/5 font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {DOTS[tone] && <span aria-hidden="true" className={cn('size-1.5 flex-none rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}

/** Dashed "exemplo" tag on sample records. */
export function SampleChip({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1.5 inline-flex rounded-full border border-dashed border-border-strong px-2.5 text-xs/[18px] font-medium text-fg-subtle">
      exemplo
    </span>
  );
}

/** Rounded counter next to a heading. `hot` inverts it to call attention. */
export function Count({ value, hot }: { value: number; hot?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-px text-xs font-bold tracking-normal',
        hot ? 'bg-fg text-bg' : 'bg-surface-muted text-fg-muted',
      )}
    >
      {value}
    </span>
  );
}
