import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'md' | 'sm';

const VARIANTS: Record<ButtonVariant, string> = {
  default: 'border-border-strong bg-surface text-fg hover:border-fg-subtle',
  primary: 'border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-surface-muted hover:text-fg',
  danger: 'border-border-strong bg-surface text-danger hover:border-fg-subtle',
  'danger-ghost': 'border-transparent bg-transparent text-danger hover:bg-surface-muted',
};
const SIZES: Record<ButtonSize, string> = {
  md: 'px-5 py-2 text-sm [&_svg]:size-4.5',
  sm: 'px-3 py-1.5 text-xs [&_svg]:size-4',
};

/** Class names of a button, for elements that look like one (links, labels). */
export const buttonClass = (variant: ButtonVariant = 'default', size: ButtonSize = 'md', className?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-full border font-semibold whitespace-nowrap transition-[background-color,border-color,transform] duration-150 active:translate-y-px disabled:cursor-wait disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label. */
  icon?: IconName;
}

export function Button({ variant, size, icon, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/** Round icon-only button; `label` is its accessible name (and tooltip). */
export function IconButton({
  icon,
  label,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-9 flex-none place-items-center rounded-full border border-border-strong text-fg-muted hover:bg-surface-muted hover:text-fg [&_svg]:size-4.5',
        className,
      )}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}

/**
 * Destructive button that asks twice: the first click turns it red with `confirmLabel`,
 * the second one runs `onConfirm`. It disarms itself after a few seconds or when focus leaves.
 * `outlined` gives it a border (a standalone action); inside table rows and form footers it has none.
 */
export function ConfirmButton({
  children,
  confirmLabel = 'Confirmar exclusão',
  onConfirm,
  size,
  outlined,
  className,
}: {
  children: ReactNode;
  outlined?: boolean;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  size?: ButtonSize;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <Button
      variant={outlined ? 'danger' : 'danger-ghost'}
      size={size}
      className={cn(armed && 'border-danger bg-danger text-on-danger hover:bg-danger', className)}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setArmed(false), 4000);
          return;
        }
        setArmed(false);
        void onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
