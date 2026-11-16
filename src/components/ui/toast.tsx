/* Toast: short confirmation at the bottom of the screen ("Salvo"). Call toast() from anywhere;
   <Toaster /> (once, in the app shell) shows it and screen readers announce it. */
import { useSyncExternalStore } from 'react';

interface ToastState {
  message: string;
  id: number;
}
let state: ToastState | null = null;
let timer: number | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function toast(message: string, { duration = 2400 }: { duration?: number } = {}) {
  state = { message, id: (state?.id ?? 0) + 1 };
  emit();
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    state = null;
    emit();
  }, duration);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function Toaster() {
  const current = useSyncExternalStore(subscribe, () => state);
  return (
    // The live region is always in the page so every new message is announced.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-70 flex justify-center px-4 max-lg:bottom-[calc(92px+env(safe-area-inset-bottom,0px))]"
    >
      {current && (
        <div
          key={current.id}
          data-testid="toast"
          className="flex max-w-full items-center gap-2.5 rounded-full bg-fg px-5 py-3 font-semibold text-bg shadow-lg before:size-[7px] before:flex-none before:rounded-full before:bg-current before:opacity-60"
        >
          {current.message}
        </div>
      )}
    </div>
  );
}
