import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentOption<V extends string> {
  value: V;
  label: ReactNode;
  /** Small number after the label (e.g. how many items). */
  count?: number;
  title?: string;
}

/** Group of toggle buttons where one is pressed (a filter or a view mode). */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  label: string;
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex gap-0.5 rounded-full border border-border bg-surface-muted', size === 'sm' ? 'p-[3px]' : 'p-1', className)}
    >
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold text-fg-muted hover:text-fg focus-visible:outline-offset-1 aria-pressed:bg-fg aria-pressed:text-bg',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            size === 'lg' && 'flex-1 px-3 py-2.5 text-sm [&_svg]:size-4.5',
          )}
        >
          {o.label}
          {o.count != null && <span className="text-2xs font-semibold opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
