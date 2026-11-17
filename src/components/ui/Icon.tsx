import { cn } from '@/lib/cn';

// Stroke icons (24×24) drawn for the dashboard.
const PATHS = {
  visao: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </>
  ),
  tarefas: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  preco: (
    <>
      <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  catalogo: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </>
  ),
  insumos: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  gastos: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19M7 15h3" />
    </>
  ),
  pedidos: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  producao: (
    <>
      <path d="M6 9V3h12v6" />
      <rect x="2" y="9" width="20" height="9" rx="2" />
      <path d="M6 14h12v7H6z" />
    </>
  ),
  ajustes: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  chevL: <path d="m15 18-6-6 6-6" />,
  chevR: <path d="m9 18 6-6-6-6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  auto: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  grip: <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" strokeWidth="3" strokeLinecap="round" />,
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** Decorative icon (hidden from screen readers; the button or text next to it carries the meaning). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={cn(
        'size-5 flex-none fill-none stroke-current [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]',
        className,
      )}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Four-point star used on featured cards. */
export function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5c.5 5.4 1.6 8.5 4 9.6 1.4.6 3.3.8 6.5.9-3.2.1-5.1.3-6.5.9-2.4 1.1-3.5 4.2-4 9.6-.5-5.4-1.6-8.5-4-9.6C6.6 12.3 4.7 12.1 1.5 12c3.2-.1 5.1-.3 6.5-.9 2.4-1.1 3.5-4.2 4-9.6z" />
    </svg>
  );
}
