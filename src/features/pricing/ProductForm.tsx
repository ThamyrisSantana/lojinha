import { useState } from 'react';
import { FormProvider, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useUserId } from '@/auth/AuthProvider';
import { Button, IconButton } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import {
  FieldGrid,
  Fieldset,
  FieldShell,
  Preview,
  SelectField,
  Suggestions,
  TextareaField,
  TextField,
  controlClass,
} from '@/components/ui/Field';
import { Note, Sub } from '@/components/ui/Layout';
import { Avatar } from '@/components/ui/Stats';
import { perPiece, type Calc } from '@/domain/calc';
import { CAT_PROD, PAPEIS, QUALIDADES } from '@/domain/constants';
import { IMAGE_ACCEPT, uploadImage } from '@/data/images';
import { useCalc } from '@/data/queries';
import type { FormProps } from '@/features/forms/FormHost';
import { DeleteButton } from '@/features/forms/DeleteButton';
import { decimal, requiredText, stringValues, text, useSaveFromForm, useZodForm } from '@/features/forms/formKit';
import { cn } from '@/lib/cn';
import { newId } from '@/lib/ids';
import { brl, fmt, pct } from '@/lib/format';

const line = z.object({ insumoId: text(), qtd: decimal(), rende: decimal() });
const TEXT = ['nome', 'categoria', 'sku', 'imagem', 'tamanho', 'papel', 'qualidade', 'densidade', 'impressora', 'obsImpressao'] as const;
const NUMBERS = [
  'tempoMin',
  'custoExtra',
  'margem',
  'taxa',
  'preco',
  'qtdImprimir',
  'pecasFolha',
  'brilho',
  'contraste',
  'saturacao',
  'estoqueInicial',
] as const;
const schema = z.object({
  nome: requiredText('Dê um nome ao produto.'),
  categoria: text(),
  sku: text(),
  imagem: text(),
  insumos: z.array(line),
  tempoMin: decimal(),
  custoExtra: decimal(),
  margem: decimal(),
  taxa: decimal(),
  preco: decimal(),
  qtdImprimir: decimal(),
  tamanho: text(),
  pecasFolha: decimal(),
  papel: text(),
  qualidade: text(),
  densidade: text(),
  impressora: text(),
  brilho: decimal(),
  contraste: decimal(),
  saturacao: decimal(),
  obsImpressao: text(),
  estoqueInicial: decimal(),
});
type Values = z.infer<typeof schema>;

export default function ProductForm({ id, onClose }: FormProps) {
  const calc = useCalc();
  const current = id ? calc.db.produtos.find(p => p.id === id) : undefined;
  const base = current ?? { qualidade: 'Alta', tempoMin: '5', insumos: [] };
  const form = useZodForm(schema, {
    ...stringValues(base, [...TEXT, ...NUMBERS]),
    insumos: (base.insumos ?? []).map(l => stringValues(l, ['insumoId', 'qtd', 'rende'])),
  });
  const { submit, saving } = useSaveFromForm('produtos', onClose);
  const c = calc.cfg();

  return (
    <FormProvider {...form}>
      <Drawer
        title={id ? 'Editar produto' : 'Novo produto'}
        onClose={onClose}
        submitting={saving}
        onSubmit={form.handleSubmit(v =>
          submit({ ...current, ...v, insumos: v.insumos.filter(l => l.insumoId), id: id ?? newId() }, current),
        )}
        footer={<DeleteButton colecao="produtos" id={id} onDone={onClose} />}
      >
        <Fieldset legend="Produto">
          <FieldGrid>
            <TextField name="nome" label="Nome" full placeholder="Ex.: Botton Gatinho Lunar 38mm" />
            <TextField name="categoria" label="Categoria" list="dl-cat-prod" />
            <TextField name="sku" label="Código / SKU" placeholder="opcional" />
            <ImagePicker />
          </FieldGrid>
        </Fieldset>
        <Fieldset legend="Insumos usados por peça">
          <Sub>Use "rende" quando um insumo vira várias peças. Ex.: 1 folha A4 rende 12 bottons de 38mm.</Sub>
          <RecipeLines calc={calc} />
        </Fieldset>
        <Fieldset legend="Tempo e preço">
          <FieldGrid>
            <TextField name="tempoMin" label="Tempo de produção por peça (min)" decimal />
            <TextField
              name="custoExtra"
              label="Outros custos por peça (R$)"
              decimal
              help="Embalagem, brinde, tag… se não estiverem nos insumos."
            />
            <TextField name="margem" label="Margem de lucro (%)" decimal placeholder={`padrão ${c.margem}%`} />
            <TextField name="taxa" label="Taxa de venda (%)" decimal placeholder={`padrão ${c.taxa}%`} />
            <TextField
              name="preco"
              label="Preço de venda (R$)"
              decimal
              full
              placeholder="vazio = usar sugerido"
              help="Deixe vazio para usar o preço sugerido arredondado."
            />
          </FieldGrid>
          <CostPreview calc={calc} />
        </Fieldset>
        <Fieldset legend="Impressão">
          <FieldGrid cols={3}>
            <TextField name="qtdImprimir" label="Quantidade para imprimir" decimal />
            <TextField name="tamanho" label="Tamanho" placeholder="Ex.: A5, 38mm, 10×15" />
            <TextField name="pecasFolha" label="Peças por folha" decimal />
            <TextField name="papel" label="Tipo de papel" list="dl-papel" full />
            <SelectField name="qualidade" label="Qualidade" options={QUALIDADES} />
            <TextField name="densidade" label="Densidade" placeholder="Ex.: +1, 3, média" />
            <TextField name="impressora" label="Impressora" placeholder="Ex.: Epson L3250" />
            <TextField name="brilho" label="Brilho" decimal placeholder="0" />
            <TextField name="contraste" label="Contraste" decimal placeholder="0" />
            <TextField name="saturacao" label="Saturação" decimal placeholder="0" />
            <TextareaField name="obsImpressao" label="Observações de impressão" full />
          </FieldGrid>
        </Fieldset>
        <Fieldset legend="Estoque">
          <FieldGrid>
            <TextField
              name="estoqueInicial"
              label="Peças prontas que você já tinha"
              decimal
              help="Depois disso, o estoque sobe com a Produção e desce com os Pedidos."
            />
          </FieldGrid>
        </Fieldset>
        <Suggestions id="dl-cat-prod" values={CAT_PROD} />
        <Suggestions id="dl-papel" values={PAPEIS} />
      </Drawer>
    </FormProvider>
  );
}

function RecipeLines({ calc }: { calc: Calc }) {
  const { control } = useFormContext<Values>();
  const lines = useFieldArray({ control, name: 'insumos' });
  const watched = useWatch({ control, name: 'insumos' });
  const supplies = calc.db.insumos.toSorted((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  return (
    <>
      <div className="flex flex-col gap-2">
        {lines.fields.map((f, index) => {
          const l = watched?.[index];
          const ins = calc.insById(l?.insumoId);
          const q = l ? perPiece(l) : 0;
          const u = ins ? calc.custoUnit(ins).valor : 0;
          return (
            <div
              key={f.id}
              data-row="recipe"
              className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] items-end gap-2 rounded-sm border border-border bg-surface p-3 max-sm:grid-cols-2 max-sm:[&>*:first-child]:col-span-full"
            >
              <SelectField
                name={`insumos.${index}.insumoId`}
                label="Insumo"
                options={[
                  { value: '', label: 'Escolha…' },
                  ...supplies.map(i => ({ value: i.id, label: `${i.nome} (${i.unidade || 'un'})` })),
                ]}
              />
              <TextField name={`insumos.${index}.qtd`} label="Quantidade" decimal />
              <TextField name={`insumos.${index}.rende`} label="Rende (peças)" decimal />
              <IconButton icon="close" label="Remover insumo" onClick={() => lines.remove(index)} />
              {ins && (
                <Sub className="col-span-full">
                  {fmt(q, 4)} {ins.unidade || 'un'} × {brl(u)} = {brl(q * u)} por peça
                </Sub>
              )}
            </div>
          );
        })}
      </div>
      <div>
        {supplies.length ? (
          <Button size="sm" onClick={() => lines.append({ insumoId: '', qtd: '1', rende: '1' }, { shouldFocus: true })}>
            + Adicionar insumo
          </Button>
        ) : (
          <Note tone="warn">Cadastre insumos primeiro na aba Insumos.</Note>
        )}
      </div>
    </>
  );
}

/** Live cost and price of the values being typed. */
function CostPreview({ calc }: { calc: Calc }) {
  const v = useWatch<Values>() as Values;
  const k = calc.custoOf(v);
  return (
    <Preview
      items={[
        { label: 'Custo total', value: brl(k.total) },
        { label: 'Sugerido', value: brl(k.redondo) },
        { label: 'Lucro / peça', value: brl(k.lucro), big: true },
      ]}
      line={`materiais ${brl(k.mat)} + perda ${brl(k.perda)} + mão de obra ${brl(k.mo)} + extras ${brl(k.extra)} · vendendo a ${brl(k.preco)} a margem real fica em ${pct(k.margemReal)}`}
    />
  );
}

/** Artwork upload: preview, file input and status message. */
function ImagePicker() {
  const { setValue, getValues } = useFormContext<Values>();
  const userId = useUserId();
  const [image, setImage] = useState(getValues('imagem'));
  const [message, setMessage] = useState('PNG, JPG ou WEBP, até 10 MB.');
  return (
    <FieldShell label="Imagem da arte" full help={<span aria-live="polite">{message}</span>}>
      {({ id, describedBy }) => (
        <div className="flex items-center gap-3.5">
          <Avatar name={getValues('nome')} image={image} />
          <input
            id={id}
            type="file"
            accept={IMAGE_ACCEPT}
            aria-describedby={describedBy}
            className={cn(controlClass, 'flex-1 border-dashed bg-transparent text-xs')}
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMessage('Enviando…');
              try {
                const stored = await uploadImage(file, userId);
                setValue('imagem', stored, { shouldDirty: true });
                setImage(stored);
                setMessage('Imagem salva.');
              } catch (err) {
                setMessage((err as Error).message || 'Não foi possível salvar a imagem.');
              }
            }}
          />
        </div>
      )}
    </FieldShell>
  );
}
