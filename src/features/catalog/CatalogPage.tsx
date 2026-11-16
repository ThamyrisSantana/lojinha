import { getRouteApi } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Chip, SampleChip } from '@/components/ui/Chip';
import { EmptyState, PageHeader, Sub } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { Avatar } from '@/components/ui/Stats';
import type { NumLike, Produto } from '@/domain/types';
import { useCalc } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { cn } from '@/lib/cn';
import { filled, fmt, num, plural } from '@/lib/format';

const route = getRouteApi('/catalogo');

export default function CatalogPage() {
  const calc = useCalc();
  const openForm = useOpenForm();
  const { fila } = route.useSearch();
  const navigate = route.useNavigate();
  const all = calc.db.produtos.toSorted((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const queue = all.filter(p => num(p.qtdImprimir) > 0);
  const list = fila ? queue : all;
  const newButton = (
    <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'produto' })}>
      Novo produto
    </Button>
  );

  return (
    <>
      <PageHeader
        title={
          <>
            Catálogo <em>&amp;</em> impressão
          </>
        }
        description="Cada produto com a arte, as peças prontas e a ficha de impressão. Registrar uma impressão desconta os insumos do estoque."
        actions={
          <>
            <Segmented
              label="Mostrar"
              value={fila ? 'fila' : 'todos'}
              onChange={v => navigate({ search: { fila: v === 'fila' || undefined } })}
              options={[
                { value: 'todos', label: 'Todos', count: all.length },
                { value: 'fila', label: 'Na fila', count: queue.length },
              ]}
            />
            {newButton}
          </>
        }
      />
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 max-sm:grid-cols-1">
          {list.map(p => (
            <ProductCard key={p.id} product={p} stock={calc.estoqueProd(p)} />
          ))}
        </div>
      ) : fila ? (
        <EmptyState title="Fila de impressão vazia">Defina "quantidade para imprimir" em um produto para ele aparecer aqui.</EmptyState>
      ) : (
        <EmptyState title="Nenhum produto cadastrado" action={newButton}>
          Adicione a arte, o papel e as configurações de cor que funcionam na sua impressora.
        </EmptyState>
      )}
    </>
  );
}

const signed = (v: NumLike) => (num(v) > 0 ? '+' : '') + v;

/** Print settings as label/value pairs; empty fields are left out. */
function printSpecs(p: Produto): { label: string; value: string; wide?: boolean }[] {
  const pairs = (
    [
      ['Tamanho', p.tamanho],
      ['Peças por folha', p.pecasFolha],
      ['Qualidade', p.qualidade],
      ['Densidade', p.densidade],
      ['Impressora', p.impressora],
    ] as const
  ).filter(([, v]) => filled(v));
  // Brightness, contrast and saturation become one line.
  const color = (
    [
      ['brilho', p.brilho],
      ['contraste', p.contraste],
      ['saturação', p.saturacao],
    ] as const
  ).filter(([, v]) => filled(v));
  const changed = color.filter(([, v]) => num(v) !== 0);
  return [
    ...(filled(p.papel) ? [{ label: 'Papel', value: String(p.papel), wide: true }] : []),
    // An odd number of half-width fields: the last one takes the full row.
    ...pairs.map(([label, v], i) => ({ label, value: String(v), wide: pairs.length % 2 === 1 && i === pairs.length - 1 })),
    ...(color.length
      ? [
          {
            label: 'Ajuste de cor',
            value: changed.length ? changed.map(([n, v]) => `${n} ${signed(v)}`).join(' · ') : 'sem ajuste',
            wide: true,
          },
        ]
      : []),
    ...(filled(p.obsImpressao) ? [{ label: 'Observações', value: String(p.obsImpressao), wide: true }] : []),
  ];
}

function ProductCard({ product: p, stock }: { product: Produto; stock: number }) {
  const openForm = useOpenForm();
  const queued = num(p.qtdImprimir);
  const specs = printSpecs(p);
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-sm transition-colors hover:border-border-strong">
      <div className="flex items-center gap-3.5">
        <Avatar name={p.nome} image={p.imagem} shape={p.categoria === 'Botton' ? 'round' : 'square'} />
        <div className="min-w-0">
          <h3 className="text-md/snug font-bold tracking-tight">{p.nome}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{p.categoria || 'Sem categoria'}</Chip>
            <Chip tone={stock <= 0 ? 'bad' : stock < 5 ? 'warn' : 'good'}>
              {fmt(stock, 0)} {plural(stock, 'pronta')}
            </Chip>
            <SampleChip show={p.exemplo} />
          </div>
        </div>
      </div>
      <p className="-mb-2 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">Ficha de impressão</p>
      {specs.length ? (
        <dl className="m-0 grid grid-cols-2 overflow-hidden rounded-sm border border-border bg-surface-sunken">
          {specs.map(s => (
            <div
              key={s.label}
              className={cn('min-w-0 px-3 py-2 shadow-[inset_-1px_-1px_0_var(--color-border)]', s.wide && 'col-span-full')}
            >
              <dt className="text-2xs font-medium text-fg-subtle">{s.label}</dt>
              <dd className="m-0 mt-px text-sm font-semibold [overflow-wrap:anywhere]">{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Sub>Ainda sem ficha. Clique em Editar para anotar papel, tamanho e ajustes de cor.</Sub>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
        <div className="flex items-baseline gap-1.5">
          <b className={cn('text-xl font-bold', !queued && 'text-fg-subtle')}>{fmt(queued, 0)}</b>
          <span className="text-xs text-fg-muted">para imprimir</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => openForm({ kind: 'produto', id: p.id })}>
            Editar
          </Button>
          {queued > 0 && (
            <Button size="sm" variant="primary" onClick={() => openForm({ kind: 'producao', produtoId: p.id })}>
              Registrar impressão
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
