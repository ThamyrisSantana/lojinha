import { mesLongo, shiftMonth, thisMonth } from '@/lib/dates';
import { IconButton } from './Button';

/** Month picker: arrows move one month; the month name goes back to the current month. */
export function MonthNav({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const current = thisMonth();
  const base = value || current;
  return (
    <div
      role="group"
      aria-label="Mês"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-sm"
    >
      <IconButton icon="chevL" label="Mês anterior" className="size-8 border-0" onClick={() => onChange(shiftMonth(base, -1))} />
      <button
        type="button"
        title="Voltar para o mês atual"
        onClick={() => onChange(current)}
        className="min-w-34 text-center text-sm/tight font-semibold first-letter:uppercase"
      >
        {mesLongo(value)}
        {value && value !== current && <small className="block text-2xs/none font-medium text-fg-subtle">voltar para hoje</small>}
      </button>
      <IconButton icon="chevR" label="Próximo mês" className="size-8 border-0" onClick={() => onChange(shiftMonth(base, 1))} />
    </div>
  );
}
