/* Form fields bound to React Hook Form (through useFormContext). Each field links its label,
   help text and error message to the control, so screen readers read all three. */
import { useId, type ChangeEventHandler, type ComponentProps, type ReactNode } from 'react';
import { get, useFormContext, type FieldValues } from 'react-hook-form';
import { cn } from '@/lib/cn';

/** Shared look of inputs, selects and textareas. */
export const controlClass =
  'w-full min-w-0 rounded-sm border border-border-strong bg-surface px-3 py-2.5 text-fg transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-fg-subtle focus:border-fg focus:shadow-[0_0_0_3px_var(--color-focus-ring)] focus:outline-none aria-invalid:border-danger';

interface FieldShellProps {
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  /** Takes the full row of the form grid. */
  full?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label + control + help/error, for custom controls. */
export function FieldShell({ label, help, error, full, className, children }: FieldShellProps) {
  const id = useId();
  const helpId = help ? id + '-help' : undefined;
  const errorId = error ? id + '-error' : undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', full && 'col-span-full', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-fg-muted">
        {label}
      </label>
      {children({ id, describedBy: [errorId, helpId].filter(Boolean).join(' ') || undefined, invalid: !!error })}
      {error && (
        <small id={errorId} className="text-xs/[1.4] font-semibold text-danger">
          {error}
        </small>
      )}
      {help && (
        <small id={helpId} className="text-xs/[1.4] text-fg-subtle">
          {help}
        </small>
      )}
    </div>
  );
}

/** Registers a field; an extra onChange from the caller runs after the form's own. */
function useField(name: string, onChange?: ChangeEventHandler<HTMLElement>) {
  const { register, formState } = useFormContext<FieldValues>();
  const error = (get(formState.errors, name) as { message?: string } | undefined)?.message;
  return { registered: register(name, { onChange }), error };
}

type Common = { name: string; label: ReactNode; help?: ReactNode; full?: boolean; className?: string };

export function TextField({
  name,
  label,
  help,
  full,
  className,
  decimal,
  onChange,
  ...props
}: Common & ComponentProps<'input'> & { decimal?: boolean }) {
  const { registered, error } = useField(name, onChange);
  return (
    <FieldShell label={label} help={help} error={error} full={full} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          inputMode={decimal ? 'decimal' : undefined}
          className={controlClass}
          {...registered}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export type Option = string | { value: string; label: string };
const optionValue = (o: Option) => (typeof o === 'string' ? o : o.value);
const optionLabel = (o: Option) => (typeof o === 'string' ? o : o.label);

export function SelectField({
  name,
  label,
  help,
  full,
  className,
  options,
  onChange,
  ...props
}: Common & ComponentProps<'select'> & { options: Option[] }) {
  const { registered, error } = useField(name, onChange);
  return (
    <FieldShell label={label} help={help} error={error} full={full} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={controlClass}
          {...registered}
          {...props}
        >
          {options.map(o => (
            <option key={optionValue(o)} value={optionValue(o)}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function TextareaField({ name, label, help, full, className, onChange, ...props }: Common & ComponentProps<'textarea'>) {
  const { registered, error } = useField(name, onChange);
  return (
    <FieldShell label={label} help={help} error={error} full={full} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={2}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'min-h-18 resize-y')}
          {...registered}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function CheckboxField({ name, label }: { name: string; label: ReactNode }) {
  const { register } = useFormContext<FieldValues>();
  return (
    <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 font-medium text-fg-muted">
      <input type="checkbox" className="size-[17px] accent-fg" {...register(name)} />
      {label}
    </label>
  );
}

/** Suggestions for a text field (<input list="...">). */
export const Suggestions = ({ id, values }: { id: string; values: string[] }) => (
  <datalist id={id}>
    {values.map(v => (
      <option key={v} value={v} />
    ))}
  </datalist>
);

/** Titled group of fields with the dot-and-line legend. */
export function Fieldset({ legend, children, className }: { legend?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn('m-0 flex min-w-0 flex-col gap-3 border-0 p-0', className)}>
      {legend && (
        <legend className="mb-3 flex w-full items-center gap-2.5 p-0 text-md font-bold before:size-[7px] before:flex-none before:rounded-full before:bg-fg after:h-px after:flex-1 after:bg-border">
          {legend}
        </legend>
      )}
      {children}
    </fieldset>
  );
}

/** Two-column grid of fields (one column on phones). */
export const FieldGrid = ({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) => (
  <div className={cn('grid gap-3.5 max-sm:grid-cols-1', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>{children}</div>
);

/** Live result shown inside a form (cost, totals): inverted card with three numbers and a line. */
export function Preview({ items, line }: { items: { label: string; value: string; big?: boolean }[]; line?: ReactNode }) {
  return (
    <div aria-live="polite" className="grid grid-cols-3 gap-3 rounded-sm bg-accent px-5 py-4 text-on-accent max-sm:grid-cols-2">
      {items.map(i => (
        <div key={i.label} className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-medium text-on-accent-muted">{i.label}</span>
          <b className={cn('font-bold tabular-nums', i.big ? 'text-xl' : 'text-lg')}>{i.value}</b>
        </div>
      ))}
      {line && <div className="col-span-full border-t border-on-accent/15 pt-2.5 text-xs text-on-accent-muted">{line}</div>}
    </div>
  );
}
