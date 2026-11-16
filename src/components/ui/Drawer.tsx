import { useEffect, useRef, type FormEventHandler, type ReactNode } from 'react';
import { Button, IconButton } from './Button';

/**
 * Side panel for forms, built on the native <dialog>: the browser moves focus into it, makes
 * the page behind inert, closes it on Escape and gives focus back to what opened it.
 */
export function Drawer({
  title,
  onClose,
  onSubmit,
  footer,
  submitting,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Extra footer content on the left (e.g. a delete button). */
  footer?: ReactNode;
  submitting?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    // Start on the first field rather than on the close button.
    dialog.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]), select, textarea')?.focus();
    return () => {
      dialog.close();
      // React removes the dialog before the browser can restore focus, so do it here.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="drawer-title"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => e.target === ref.current && onClose()}
      className="fixed inset-y-3 right-3 left-auto m-0 h-auto max-h-none w-[min(var(--container-drawer),calc(100%-24px))] flex-col overflow-hidden rounded-lg border border-border bg-bg p-0 text-fg shadow-lg backdrop:bg-overlay backdrop:backdrop-blur-[3px] open:flex motion-safe:animate-slide-in max-sm:inset-0 max-sm:w-full max-sm:rounded-none max-sm:border-0"
    >
      <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2.5 border-b border-border bg-surface px-6 pt-[calc(20px+env(safe-area-inset-top,0px))] pb-4">
          <h2 id="drawer-title" className="text-xl font-bold tracking-tight">
            {title}
          </h2>
          <IconButton icon="close" label="Fechar" onClick={onClose} />
        </div>
        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 pt-6 pb-8">{children}</div>
        <div className="flex justify-between gap-2 border-t border-border bg-surface px-6 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          {footer}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              Salvar
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
