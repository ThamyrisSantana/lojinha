import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Drawer } from '@/components/ui/Drawer';
import { CheckboxField, FieldGrid, Fieldset, SelectField, Suggestions, TextareaField, TextField } from '@/components/ui/Field';
import { ETIQUETAS, PRIORITY_OPTIONS } from '@/domain/constants';
import type { Tarefa } from '@/domain/types';
import { useDb } from '@/data/queries';
import type { FormProps } from '@/features/forms/FormHost';
import { DeleteButton } from '@/features/forms/DeleteButton';
import { requiredText, stringValues, text, useSaveFromForm, useZodForm } from '@/features/forms/formKit';
import { nowISO } from '@/lib/dates';
import { newId } from '@/lib/errors';

const schema = z.object({
  titulo: requiredText('Escreva a tarefa.'),
  prazo: text(),
  prioridade: z.enum(['alta', 'media', 'baixa']),
  etiqueta: text(),
  notas: text(),
  feito: z.boolean(),
});

export default function TaskForm({ id, preset, onClose }: FormProps & { preset?: Partial<Tarefa> }) {
  const db = useDb();
  const current = id ? db.tarefas.find(t => t.id === id) : undefined;
  const base = { prioridade: 'media' as const, ...preset, ...current };
  const form = useZodForm(schema, {
    ...stringValues(base, ['titulo', 'prazo', 'etiqueta', 'notas']),
    prioridade: base.prioridade ?? 'media',
    feito: !!base.feito,
  });
  const { submit, saving } = useSaveFromForm('tarefas', onClose);

  return (
    <FormProvider {...form}>
      <Drawer
        title={id ? 'Editar tarefa' : 'Nova tarefa'}
        onClose={onClose}
        submitting={saving}
        onSubmit={form.handleSubmit(v =>
          submit(
            {
              ...current,
              ...v,
              // Keep the original completion date; set it when the task is first marked done.
              feitoEm: !v.feito ? '' : current?.feito ? current.feitoEm || '' : nowISO(),
              id: id ?? newId(),
            },
            current,
          ),
        )}
        footer={<DeleteButton colecao="tarefas" id={id} onDone={onClose} />}
      >
        <Fieldset>
          <FieldGrid>
            <TextField name="titulo" label="Tarefa" full placeholder="Ex.: comprar argolas para chaveiro" />
            <TextField name="prazo" label="Prazo" type="date" />
            <SelectField name="prioridade" label="Prioridade" options={PRIORITY_OPTIONS} />
            <TextField name="etiqueta" label="Etiqueta" list="dl-etq" placeholder="Ex.: Produção" />
            <CheckboxField name="feito" label="Concluída" />
            <TextareaField name="notas" label="Notas" full />
          </FieldGrid>
        </Fieldset>
        <Suggestions id="dl-etq" values={ETIQUETAS} />
      </Drawer>
    </FormProvider>
  );
}
