/* Building blocks shared by every form: Zod field rules, saving and deleting a record. */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '@/components/ui/toast';
import type { Collection, RecordOf } from '@/domain/types';
import { useSave } from '@/data/queries';
import { nowISO } from '@/lib/dates';
import { DECIMAL } from '@/lib/format';

/* ---------- field rules ---------- */
/** Optional decimal as typed ("1,5"); stored as text, like every version of the app did. */
export const decimal = () => z.string().regex(DECIMAL, 'Digite só números (ex.: 12,50).');
export const requiredDecimal = (message = 'Preencha este campo.') => decimal().min(1, message);
export const requiredText = (message = 'Preencha este campo.') => z.string().trim().min(1, message);
export const text = () => z.string();
export const date = (message = 'Escolha a data.') => z.string().min(1, message);

/** React Hook Form set up with a Zod schema. */
export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(schema: S, defaultValues: DefaultValues<z.infer<S>>) {
  return useForm<z.infer<S>>({ resolver: zodResolver(schema as never), defaultValues, mode: 'onTouched' });
}

/** Form values as strings: missing fields become '' so inputs are always controlled. */
export function stringValues<K extends string>(source: Partial<Record<K, unknown>> | undefined, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map(k => [k, source?.[k] == null ? '' : String(source[k])])) as Record<K, string>;
}

/**
 * Saves a record from a form: keeps its sample flag and creation date, shows "Salvo" and closes.
 * On failure the drawer stays open (the error message comes from the save hook).
 */
export function useSaveFromForm<C extends Collection>(colecao: C, onClose: () => void) {
  const { save, isPending } = useSave();
  const submit = async (record: RecordOf<C>, previous?: Partial<RecordOf<C>>, message = 'Salvo') => {
    const full = { ...record, criadoEm: previous?.criadoEm || nowISO(), ...(previous?.exemplo ? { exemplo: true } : {}) } as RecordOf<C>;
    try {
      await save(colecao, full);
      toast(message);
      onClose();
    } catch {
      /* already reported */
    }
  };
  return { submit, saving: isPending };
}
