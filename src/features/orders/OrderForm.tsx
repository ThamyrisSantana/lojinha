import { FormProvider, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, IconButton } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { FieldGrid, Fieldset, Preview, SelectField, Suggestions, TextareaField, TextField } from '@/components/ui/Field';
import { Note } from '@/components/ui/Layout';
import { totPedido } from '@/domain/calc';
import { CANAIS, STATUS_OPTIONS } from '@/domain/constants';
import type { OrderStatus } from '@/domain/types';
import { useCalc } from '@/data/queries';
import type { FormProps } from '@/features/forms/FormHost';
import { DeleteButton } from '@/features/forms/DeleteButton';
import { date, decimal, stringValues, text, useSaveFromForm, useZodForm } from '@/features/forms/formKit';
import { today } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { brl, num, pct, plural } from '@/lib/format';

const item = z.object({ produtoId: text(), qtd: decimal(), preco: decimal() });
const schema = z.object({
  data: date(),
  numero: text(),
  canal: text(),
  cliente: text(),
  status: z.enum(['novo', 'produzindo', 'enviado', 'entregue', 'cancelado']),
  nf: text(),
  itens: z.array(item),
  freteCobrado: decimal(),
  desconto: decimal(),
  taxaValor: decimal(),
  custoEnvio: decimal(),
  rastreio: text(),
  obs: text(),
});
type Values = z.infer<typeof schema>;
const TEXT_FIELDS = [
  'data',
  'numero',
  'canal',
  'cliente',
  'nf',
  'freteCobrado',
  'desconto',
  'taxaValor',
  'custoEnvio',
  'rastreio',
  'obs',
] as const;

export default function OrderForm({ id, onClose }: FormProps) {
  const calc = useCalc();
  const current = id ? calc.db.pedidos.find(o => o.id === id) : undefined;
  const form = useZodForm(schema, {
    ...stringValues({ data: today(), ...current }, TEXT_FIELDS),
    status: current?.status ?? 'novo',
    itens: (current?.itens ?? [{ produtoId: '', qtd: '1', preco: '' }]).map(i => stringValues(i, ['produtoId', 'qtd', 'preco'])),
  });
  const items = useFieldArray({ control: form.control, name: 'itens' });
  const { submit, saving } = useSaveFromForm('pedidos', onClose);
  const products = calc.db.produtos.toSorted((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const onSubmit = (v: Values) =>
    submit({ ...current, ...v, status: v.status as OrderStatus, itens: v.itens.filter(i => i.produtoId), id: id ?? newId() }, current);

  return (
    <FormProvider {...form}>
      <Drawer
        title={id ? 'Pedido #' + (current?.numero || '') : 'Novo pedido'}
        onClose={onClose}
        submitting={saving}
        onSubmit={form.handleSubmit(onSubmit)}
        footer={<DeleteButton colecao="pedidos" id={id} onDone={onClose} />}
      >
        <Fieldset>
          <FieldGrid>
            <TextField name="data" label="Data" type="date" />
            <TextField name="numero" label="Número do pedido" placeholder="Ex.: 1042" />
            <TextField name="canal" label="Canal de venda" list="dl-canal" placeholder="Instagram, Shopee…" />
            <TextField name="cliente" label="Cliente" />
            <SelectField name="status" label="Status" options={STATUS_OPTIONS} />
            <TextField name="nf" label="Nota fiscal (número)" placeholder="deixe vazio se ainda não emitiu" />
          </FieldGrid>
        </Fieldset>
        <Fieldset legend="Itens">
          <div className="flex flex-col gap-2">
            {items.fields.map((f, index) => (
              <div
                key={f.id}
                data-row="item"
                className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] items-end gap-2 rounded-sm border border-border bg-surface p-3 max-sm:grid-cols-2 max-sm:[&>*:first-child]:col-span-full"
              >
                <SelectField
                  name={`itens.${index}.produtoId`}
                  label="Produto"
                  options={[{ value: '', label: 'Escolha…' }, ...products.map(p => ({ value: p.id, label: p.nome }))]}
                  onChange={e => {
                    // Picking a product fills in its price, if the price is still empty.
                    const p = calc.prodById(e.target.value);
                    if (p && !form.getValues(`itens.${index}.preco`)) form.setValue(`itens.${index}.preco`, calc.custo(p).preco.toFixed(2));
                  }}
                />
                <TextField name={`itens.${index}.qtd`} label="Qtd" decimal />
                <TextField name={`itens.${index}.preco`} label="Preço un. (R$)" decimal />
                <IconButton icon="close" label="Remover item" onClick={() => items.remove(index)} />
              </div>
            ))}
          </div>
          <div>
            {products.length ? (
              <Button size="sm" onClick={() => items.append({ produtoId: '', qtd: '1', preco: '' }, { shouldFocus: true })}>
                + Adicionar item
              </Button>
            ) : (
              <Note tone="warn">Cadastre produtos primeiro.</Note>
            )}
          </div>
        </Fieldset>
        <Fieldset legend="Valores">
          <FieldGrid>
            <TextField name="freteCobrado" label="Frete cobrado do cliente (R$)" decimal />
            <TextField name="desconto" label="Desconto (R$)" decimal />
            <TextField name="taxaValor" label="Taxa da plataforma (R$)" decimal help="Comissão + tarifa do pagamento." />
            <TextField name="custoEnvio" label="Custo real do envio (R$)" decimal />
            <TextField name="rastreio" label="Código de rastreio" full />
            <TextareaField name="obs" label="Observações" full />
          </FieldGrid>
          <TotalsPreview defaultFee={num(calc.cfg().taxa)} />
        </Fieldset>
        <Suggestions id="dl-canal" values={CANAIS} />
      </Drawer>
    </FormProvider>
  );
}

/** Live totals; re-renders alone when the values change, not the whole form. */
function TotalsPreview({ defaultFee }: { defaultFee: number }) {
  const v = useWatch<Values>() as Values;
  const t = totPedido(v);
  const feeHint =
    !num(v.taxaValor) && t.total ? ` · taxa estimada pelo padrão (${pct(defaultFee)}): ${brl((t.total * defaultFee) / 100)}` : '';
  return (
    <Preview
      items={[
        { label: 'Subtotal', value: brl(t.sub) },
        { label: 'Total', value: brl(t.total) },
        { label: 'Líquido', value: brl(t.liquido), big: true },
      ]}
      line={`${t.pecas} ${plural(t.pecas, 'peça')}${feeHint}`}
    />
  );
}
