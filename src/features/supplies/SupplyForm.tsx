import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Drawer } from '@/components/ui/Drawer';
import { FieldGrid, Fieldset, SelectField, Suggestions, TextareaField, TextField } from '@/components/ui/Field';
import { CAT_INS, UNIDADES } from '@/domain/constants';
import type { Insumo } from '@/domain/types';
import { useDb } from '@/data/queries';
import type { FormProps } from '@/features/forms/FormHost';
import { DeleteButton } from '@/features/forms/DeleteButton';
import { decimal, requiredText, stringValues, text, useSaveFromForm, useZodForm } from '@/features/forms/formKit';
import { newId } from '@/lib/errors';

const schema = z.object({
  nome: requiredText('Dê um nome ao insumo.'),
  categoria: text(),
  unidade: text(),
  custoManual: decimal(),
  estoqueInicial: decimal(),
  estoqueMin: decimal(),
  fornecedor: text(),
  obs: text(),
});
const FIELDS = Object.keys(schema.shape) as (keyof z.infer<typeof schema>)[];

export default function SupplyForm({ id, preset, onClose }: FormProps & { preset?: Partial<Insumo> }) {
  const db = useDb();
  const current = id ? db.insumos.find(i => i.id === id) : undefined;
  const form = useZodForm(schema, stringValues({ unidade: 'un', ...preset, ...current }, FIELDS));
  const { submit, saving } = useSaveFromForm('insumos', onClose);

  return (
    <FormProvider {...form}>
      <Drawer
        title={id ? 'Editar insumo' : 'Novo insumo'}
        onClose={onClose}
        submitting={saving}
        onSubmit={form.handleSubmit(values => submit({ ...current, ...values, id: id ?? newId() }, current))}
        footer={<DeleteButton colecao="insumos" id={id} onDone={onClose} />}
      >
        <Fieldset>
          <FieldGrid>
            <TextField name="nome" label="Nome" full placeholder="Ex.: Papel couché 250g A4" />
            <TextField name="categoria" label="Categoria" list="dl-cat-ins" />
            <SelectField name="unidade" label="Unidade de medida" options={UNIDADES} />
            <TextField
              name="custoManual"
              label="Custo por unidade (R$)"
              decimal
              help="Usado até você lançar a primeira compra deste insumo em Gastos."
            />
            <TextField name="estoqueInicial" label="Estoque inicial / ajuste" decimal help="O que você já tinha antes de usar o painel." />
            <TextField name="estoqueMin" label="Avisar quando ficar abaixo de" decimal />
            <TextField name="fornecedor" label="Fornecedor" />
            <TextareaField name="obs" label="Observações" full />
          </FieldGrid>
        </Fieldset>
        <Suggestions id="dl-cat-ins" values={CAT_INS} />
      </Drawer>
    </FormProvider>
  );
}
