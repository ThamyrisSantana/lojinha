import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
/**
 * Explanation bubble on hover and on keyboard focus. The content is also linked to the
 * trigger with aria-describedby, so screen readers read it.
 */
export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div
      tabIndex={0}
      aria-describedby={id}
      className={cn('relative focus-visible:outline-2 focus-visible:outline-offset-2', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={e => e.key === 'Escape' && setOpen(false)}
    >
      {children}
      <div
        id={id}
        role="tooltip"
        // Closed, it stays in the page (visually hidden) so aria-describedby still works.
        className={
          open
            ? 'pointer-events-none absolute inset-x-0 top-full z-60 mt-2 min-w-48 rounded-sm bg-fg px-3 py-2 text-xs/[1.55] font-normal text-bg shadow-lg'
            : 'sr-only'
        }
      >
        {content}
      </div>
    </div>
  );
}
