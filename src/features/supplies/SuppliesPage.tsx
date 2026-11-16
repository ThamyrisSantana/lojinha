import { Button } from '@/components/ui/Button';
import { Chip, SampleChip } from '@/components/ui/Chip';
import { EmptyState, PageHeader, Sub } from '@/components/ui/Layout';
import { DataTable, NameCell, RowActions } from '@/components/ui/Table';
import { insStatus } from '@/domain/calc';
import type { Insumo } from '@/domain/types';
import { useCalc } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { brl, fmt, num, plural } from '@/lib/format';

export default function SuppliesPage() {
  const calc = useCalc();
  const openForm = useOpenForm();
  const rows = calc.db.insumos
    .toSorted((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .map(i => ({ ...i, m: calc.movIns(i), c: calc.custoUnit(i) }));
  const stockValue = (x: (typeof rows)[number]) => Math.max(0, x.m.estoque) * x.c.valor;
  const newButton = (
    <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'insumo' })}>
      Novo insumo
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Insumos"
        description="Estoque = estoque inicial + compras lançadas em Gastos − o que foi usado nas impressões registradas."
        actions={newButton}
      />
      {rows.length ? (
        <DataTable
          caption="Insumos"
          rows={rows}
          rowKey={r => r.id}
          columns={[
            {
              header: 'Insumo',
              cell: i => (
                <NameCell
                  name={i.nome}
                  after={<SampleChip show={i.exemplo} />}
                  sub={[i.categoria, i.fornecedor].filter(Boolean).join(' · ')}
                />
              ),
            },
            {
              header: 'Em estoque',
              numeric: true,
              cell: i => (
                <>
                  <b>{fmt(i.m.estoque)}</b> {i.unidade || 'un'}
                </>
              ),
            },
            {
              header: 'Situação',
              cell: i => {
                const [label, tone] = insStatus(i, i.m.estoque);
                return <Chip tone={tone}>{label}</Chip>;
              },
            },
            { header: 'Mínimo', numeric: true, cell: i => (num(i.estoqueMin) ? fmt(i.estoqueMin) : '—') },
            {
              header: 'Custo / unid.',
              numeric: true,
              cell: i => (
                <>
                  {brl(i.c.valor)}
                  <Sub>{i.c.fonte === 'compras' ? `média de ${i.c.n} ${plural(i.c.n, 'compra')}` : 'valor informado'}</Sub>
                </>
              ),
            },
            { header: 'Entrou', numeric: true, cell: i => fmt(num(i.estoqueInicial) + i.m.comprado) },
            { header: 'Usado', numeric: true, cell: i => fmt(i.m.usado) },
            { header: 'Valor parado', numeric: true, cell: i => brl(stockValue(i)) },
            {
              header: '',
              cell: i => (
                <RowActions>
                  <BuyButton insumo={i} />
                  <Button size="sm" variant="ghost" onClick={() => openForm({ kind: 'insumo', id: i.id })}>
                    Editar
                  </Button>
                </RowActions>
              ),
            },
          ]}
          footer={
            <tr>
              <td colSpan={7}>Valor total em estoque</td>
              <td className="text-right tabular-nums">{brl(rows.reduce((a, x) => a + stockValue(x), 0))}</td>
              <td />
            </tr>
          }
        />
      ) : (
        <EmptyState title="Nenhum insumo cadastrado" action={newButton}>
          Cadastre papéis, bases de botton, argolas, embalagens… e use-os na receita de cada produto.
        </EmptyState>
      )}
    </>
  );
}

/** "Comprei": opens a new expense already linked to the supply. */
export function BuyButton({ insumo: i, variant = 'ghost' }: { insumo: Insumo; variant?: 'ghost' | 'default' }) {
  const openForm = useOpenForm();
  return (
    <Button
      size="sm"
      variant={variant}
      onClick={() =>
        openForm({
          kind: 'gasto',
          preset: {
            insumoId: i.id,
            descricao: i.nome,
            loja: i.fornecedor || '',
            categoria: i.categoria === 'Embalagem' ? 'Embalagem' : 'Insumo',
          },
        })
      }
    >
      Comprei
    </Button>
  );
}
