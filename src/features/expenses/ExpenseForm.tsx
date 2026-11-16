import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Drawer } from '@/components/ui/Drawer';
import { FieldGrid, Fieldset, SelectField, TextField } from '@/components/ui/Field';
import { CAT_GASTO } from '@/domain/constants';
import type { Gasto } from '@/domain/types';
import { useDb } from '@/data/queries';
import type { FormProps } from '@/features/forms/FormHost';
import { DeleteButton } from '@/features/forms/DeleteButton';
import { date, decimal, requiredDecimal, requiredText, stringValues, text, useSaveFromForm, useZodForm } from '@/features/forms/formKit';
import { today } from '@/lib/dates';
import { newId } from '@/lib/errors';

const schema = z.object({
  data: date(),
  categoria: text(),
  descricao: requiredText('Descreva o gasto.'),
  loja: text(),
  nf: text(),
  valor: requiredDecimal('Informe o valor pago.'),
  frete: decimal(),
  insumoId: text(),
  qtd: decimal(),
});
const FIELDS = Object.keys(schema.shape) as (keyof z.infer<typeof schema>)[];

export default function ExpenseForm({ id, preset, onClose }: FormProps & { preset?: Partial<Gasto> }) {
  const db = useDb();
  const current = id ? db.gastos.find(g => g.id === id) : undefined;
  const form = useZodForm(schema, stringValues({ data: today(), categoria: 'Insumo', ...preset, ...current }, FIELDS));
  const { submit, saving } = useSaveFromForm('gastos', onClose);
  const supplies = db.insumos.toSorted((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  return (
    <FormProvider {...form}>
      <Drawer
        title={id ? 'Editar gasto' : 'Novo gasto'}
        onClose={onClose}
        submitting={saving}
        // Only a purchase linked to a supply adds to its stock.
        onSubmit={form.handleSubmit(v => submit({ ...current, ...v, qtd: v.insumoId ? v.qtd : '', id: id ?? newId() }, current))}
        footer={<DeleteButton colecao="gastos" id={id} onDone={onClose} />}
      >
        <Fieldset>
          <FieldGrid>
            <TextField name="data" label="Data" type="date" />
            <SelectField name="categoria" label="Categoria" options={CAT_GASTO} />
            <TextField name="descricao" label="Descrição" full placeholder="Ex.: 2 pacotes de papel couché" />
            <TextField name="loja" label="Onde comprou" placeholder="Ex.: Kalunga, Shopee" />
            <TextField name="nf" label="Nota fiscal / recibo" placeholder="opcional" />
            <TextField name="valor" label="Valor pago (R$)" decimal />
            <TextField name="frete" label="Frete (R$)" decimal />
          </FieldGrid>
        </Fieldset>
        <Fieldset legend="Entrou no estoque?">
          <FieldGrid>
            <SelectField
              name="insumoId"
              label="Insumo comprado"
              options={[
                { value: '', label: 'Não é um insumo' },
                ...supplies.map(i => ({ value: i.id, label: `${i.nome} (${i.unidade || 'un'})` })),
              ]}
            />
            <TextField name="qtd" label="Quantidade comprada" decimal help="Na unidade do insumo. Ex.: 2 pacotes de 50 folhas = 100." />
          </FieldGrid>
        </Fieldset>
      </Drawer>
    </FormProvider>
  );
}
