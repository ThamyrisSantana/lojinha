import { FormProvider, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Chip } from '@/components/ui/Chip';
import { Drawer } from '@/components/ui/Drawer';
import { CheckboxField, FieldGrid, Fieldset, SelectField, TextareaField, TextField } from '@/components/ui/Field';
import { Note, Sub } from '@/components/ui/Layout';
import { toast } from '@/components/ui/toast';
import type { Calc } from '@/domain/calc';
import { useCalc, useSave } from '@/data/queries';
import type { FormProps } from '@/features/forms/FormHost';
import { date, requiredDecimal, requiredText, text, useZodForm } from '@/features/forms/formKit';
import { nowISO, today } from '@/lib/dates';
import { newId } from '@/lib/errors';
import { fmt, num } from '@/lib/format';

const schema = z.object({
  data: date(),
  produtoId: requiredText('Escolha o produto.'),
  qtd: requiredDecimal('Quantas peças?').refine(v => num(v) > 0, 'Quantas peças?'),
  zerarFila: z.boolean(),
  obs: text(),
});

/** Registers a production batch: adds ready pieces and takes the recipe's supplies from stock. */
export default function BatchForm({ produtoId, onClose }: Omit<FormProps, 'id'> & { produtoId?: string }) {
  const calc = useCalc();
  const { saveRecords, isPending } = useSave();
  const queued = num(calc.prodById(produtoId)?.qtdImprimir);
  const form = useZodForm(schema, {
    data: today(),
    produtoId: produtoId ?? '',
    qtd: queued ? String(queued) : '',
    zerarFila: queued > 0,
    obs: '',
  });
  const products = calc.db.produtos.toSorted((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const onSubmit = form.handleSubmit(async v => {
    const p = calc.prodById(v.produtoId)!;
    const q = num(v.qtd);
    const batch = { data: v.data, produtoId: p.id, qtd: q, obs: v.obs, consumo: calc.consumoDe(p, q), criadoEm: nowISO() };
    try {
      // The batch and the cleared print queue are saved together.
      await saveRecords([
        { colecao: 'producoes', id: newId(), dados: batch },
        ...(v.zerarFila ? [{ colecao: 'produtos' as const, id: p.id, dados: { ...withoutId(p), qtdImprimir: 0 } }] : []),
      ]);
      toast(`${fmt(q, 0)} peças registradas`);
      onClose();
    } catch {
      /* already reported */
    }
  });

  return (
    <FormProvider {...form}>
      <Drawer title="Registrar lote" onClose={onClose} onSubmit={onSubmit} submitting={isPending}>
        <Fieldset>
          <FieldGrid>
            <TextField name="data" label="Data" type="date" />
            <SelectField
              name="produtoId"
              label="Produto"
              options={[{ value: '', label: 'Escolha…' }, ...products.map(p => ({ value: p.id, label: p.nome }))]}
            />
            <TextField name="qtd" label="Peças produzidas" decimal />
            <CheckboxField name="zerarFila" label="Tirar da fila de impressão" />
            <TextareaField name="obs" label="Observações" full placeholder="Ex.: reimpressão, ajustei saturação…" />
          </FieldGrid>
        </Fieldset>
        <Fieldset legend="Vai descontar do estoque">
          <ConsumptionPreview calc={calc} />
        </Fieldset>
      </Drawer>
    </FormProvider>
  );
}

function withoutId<T extends { id: string }>({ id: _id, ...rest }: T) {
  return rest;
}

function ConsumptionPreview({ calc }: { calc: Calc }) {
  const [produtoId, qtd] = useWatch({ name: ['produtoId', 'qtd'] }) as [string, string];
  const p = calc.prodById(produtoId);
  const used = calc.consumoDe(p, num(qtd));
  if (!p) return <Sub>Escolha um produto.</Sub>;
  if (!used.length) return <Note tone="warn">Este produto não tem insumos na receita; nada será descontado.</Note>;
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {used.map(c => {
        const i = calc.insById(c.insumoId);
        const stock = i ? calc.movIns(i).estoque : 0;
        const short = c.qtd > stock;
        return (
          <div key={c.insumoId} className="flex items-center gap-3 rounded-sm px-2.5 py-2.5">
            <Chip tone={short ? 'bad' : 'good'}>{short ? 'Falta' : 'Ok'}</Chip>
            <div>
              <b>
                {fmt(c.qtd, 3)} {i?.unidade || ''}
              </b>{' '}
              de {i?.nome || '?'} <span className="text-xs text-fg-subtle">· tem {fmt(stock)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
