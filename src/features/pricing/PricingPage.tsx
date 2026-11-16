import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Chip, SampleChip } from '@/components/ui/Chip';
import { EmptyState, Note, PageHeader, Sub } from '@/components/ui/Layout';
import { Avatar } from '@/components/ui/Stats';
import { DataTable, NameCell, RowActions } from '@/components/ui/Table';
import type { ProductCost } from '@/domain/calc';
import type { Produto } from '@/domain/types';
import { useCalc } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { cn } from '@/lib/cn';
import { brl, fmt, num, pct } from '@/lib/format';

const marginTone = (m: number) => (m < 15 ? 'bad' : m < 30 ? 'warn' : 'good');

export default function PricingPage() {
  const calc = useCalc();
  const openForm = useOpenForm();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const c = calc.cfg();
  const products = calc.db.produtos.toSorted((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(p => ({ ...p, k: calc.custo(p) }));
  const toggle = (id: string) =>
    setOpen(s => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const newButton = (
    <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'produto' })}>
      Novo produto
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Precificação"
        description="Quanto custa fazer cada peça (insumos + seu tempo + perdas) e por quanto vender. Clique em Detalhes para ver a conta completa."
        actions={
          <>
            <Link to="/ajustes" className={buttonClass('ghost')}>
              Mudar padrões
            </Link>
            {newButton}
          </>
        }
      >
        <div data-defaults className="mt-3 flex flex-wrap gap-1.5">
          {[
            `Mão de obra ${brl(num(c.valorHora))}/h`,
            `Margem ${pct(num(c.margem))}`,
            `Taxa de venda ${pct(num(c.taxa))}`,
            `Perda ${pct(num(c.perda))}`,
          ].map(t => (
            <Chip key={t} className="border border-border bg-surface leading-[18px]">
              {t}
            </Chip>
          ))}
        </div>
      </PageHeader>
      {products.length ? (
        <>
          <DataTable
            caption="Preços dos produtos"
            rows={products}
            rowKey={p => p.id}
            expanded={p => open.has(p.id) && <Breakdown product={p} k={p.k} wastePct={num(c.perda)} />}
            columns={[
              {
                header: 'Produto',
                cell: p => (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={p.nome} image={p.imagem} size="sm" />
                    <NameCell
                      name={p.nome}
                      after={<SampleChip show={p.exemplo} />}
                      sub={[p.categoria, p.sku].filter(Boolean).join(' · ')}
                    />
                  </div>
                ),
              },
              {
                header: 'Custo por peça',
                numeric: true,
                cell: p => (
                  <>
                    <b>{brl(p.k.total)}</b>
                    <Sub>
                      materiais {brl(p.k.mat + p.k.perda)} · {fmt(p.tempoMin, 0)} min
                    </Sub>
                  </>
                ),
              },
              { header: 'Preço sugerido', numeric: true, cell: p => brl(p.k.redondo) },
              {
                header: 'Preço de venda',
                numeric: true,
                cell: p => (
                  <>
                    <b>{brl(p.k.preco)}</b>
                    <Sub>{p.k.manual ? 'definido por você' : 'sugerido'}</Sub>
                  </>
                ),
              },
              { header: 'Lucro por peça', numeric: true, cell: p => brl(p.k.lucro) },
              { header: 'Margem', numeric: true, cell: p => <Chip tone={marginTone(p.k.margemReal)}>{pct(p.k.margemReal)}</Chip> },
              {
                header: '',
                cell: p => (
                  <RowActions>
                    <Button size="sm" variant="ghost" aria-expanded={open.has(p.id)} onClick={() => toggle(p.id)}>
                      {open.has(p.id) ? 'Fechar' : 'Detalhes'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openForm({ kind: 'produto', id: p.id })}>
                      Editar
                    </Button>
                  </RowActions>
                ),
              },
            ]}
          />
          <Note>
            O lucro já desconta a taxa da plataforma e paga seu tempo pelo valor-hora. Margem abaixo de 15% fica em vermelho, até 30% em
            amarelo. Custo dos insumos = média do que você pagou nas compras (aba Gastos), ou o valor informado no insumo.
          </Note>
        </>
      ) : (
        <EmptyState title="Nenhum produto cadastrado" action={newButton}>
          Cadastre um produto com os insumos e o tempo que leva para fazer; o preço sugerido aparece na hora.
        </EmptyState>
      )}
    </>
  );
}

/** One line of the cost summary; totals get a rule above. */
function Line({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', total && 'border-t border-border-strong pt-2 font-bold')}>
      <span className={total ? undefined : 'text-fg-muted'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Full cost calculation of one product (the "Detalhes" row). */
function Breakdown({ product: p, k, wastePct }: { product: Produto; k: ProductCost; wastePct: number }) {
  const cell = 'px-3 py-2 text-left';
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 max-lg:grid-cols-1">
      <table className="w-full overflow-hidden rounded-sm bg-surface">
        <thead className="text-xs font-semibold text-fg-subtle [&_th]:border-b [&_th]:border-border [&_th]:bg-surface-sunken">
          <tr>
            <th className={cell}>Insumo</th>
            <th className={cn(cell, 'text-right')}>Usa por peça</th>
            <th className={cn(cell, 'text-right')}>Custo unit.</th>
            <th className={cn(cell, 'text-right')}>Subtotal</th>
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
          {k.linhas.length ? (
            k.linhas.map((l, i) => (
              <tr key={i}>
                <td className={cell}>
                  {l.ins?.nome || 'Insumo removido'}
                  {num(l.rende) > 1 && (
                    <Sub>
                      {fmt(l.qtd)} {l.ins?.unidade} rende {fmt(l.rende, 0)} peças
                    </Sub>
                  )}
                </td>
                <td className={cn(cell, 'text-right tabular-nums')}>
                  {fmt(l.q, 4)} {l.ins?.unidade}
                </td>
                <td className={cn(cell, 'text-right tabular-nums')}>{brl(l.u)}</td>
                <td className={cn(cell, 'text-right tabular-nums')}>{brl(l.sub)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className={cn(cell, 'text-xs text-fg-subtle')}>
                Nenhum insumo ligado a este produto.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex flex-col gap-1.5 rounded-sm bg-surface p-3.5 text-sm">
        <Line label="Materiais" value={brl(k.mat)} />
        <Line label={`Perda (${pct(wastePct)})`} value={brl(k.perda)} />
        <Line label={`Mão de obra (${fmt(p.tempoMin, 0)} min)`} value={brl(k.mo)} />
        <Line label="Extras" value={brl(k.extra)} />
        <Line label="Custo total" value={brl(k.total)} total />
        <Line label={`Margem ${pct(k.margem)} + taxa ${pct(k.taxa)}`} value={brl(k.sugerido)} />
        <Line label="Arredondado" value={brl(k.redondo)} />
        <Line label={`Lucro por peça a ${brl(k.preco)}`} value={brl(k.lucro)} total />
      </div>
    </div>
  );
}
