import { getRouteApi } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Chip, SampleChip } from '@/components/ui/Chip';
import { EmptyState, PageHeader, Sub } from '@/components/ui/Layout';
import { MonthNav } from '@/components/ui/MonthNav';
import { Kpi } from '@/components/ui/Stats';
import { DataTable, NameCell, RowActions } from '@/components/ui/Table';
import { gastoTotal } from '@/domain/calc';
import { useCalc } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { dataBR, inMonth, mesLabel, thisMonth } from '@/lib/dates';
import { brl, fmt, num, pct, plural } from '@/lib/format';

const route = getRouteApi('/gastos');

export default function ExpensesPage() {
  const calc = useCalc();
  const openForm = useOpenForm();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const k = search.mes === 'todos' ? '' : search.mes || thisMonth();
  const setMonth = (mes: string) => navigate({ search: { mes: mes === thisMonth() ? undefined : mes || 'todos' } });

  const list = calc.db.gastos.filter(g => !k || inMonth(g, k)).toSorted((a, b) => (b.data || '').localeCompare(a.data || ''));
  const total = list.reduce((a, g) => a + gastoTotal(g), 0);
  const byCategory = Object.entries(
    list.reduce<Record<string, number>>((acc, g) => {
      const c = g.categoria || 'Outros';
      acc[c] = (acc[c] || 0) + gastoTotal(g);
      return acc;
    }, {}),
  ).toSorted((a, b) => b[1] - a[1]);
  const newButton = (
    <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'gasto' })}>
      Novo gasto
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Gastos"
        description="Tudo o que saiu do caixa da loja. Compras ligadas a um insumo entram no estoque e atualizam o custo médio."
        actions={
          <>
            <MonthNav value={k} onChange={setMonth} />
            <Button variant="ghost" onClick={() => setMonth(k ? '' : thisMonth())}>
              {k ? 'Ver todos' : 'Só este mês'}
            </Button>
            {newButton}
          </>
        }
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
        <Kpi featured label={`Total ${k ? mesLabel(k) : 'geral'}`} value={brl(total)} className="col-span-2 max-sm:col-span-full">
          {list.length} {plural(list.length, 'lançamento')}
        </Kpi>
        {byCategory.map(([c, v]) => (
          <Kpi key={c} label={c} value={brl(v)}>
            {pct((v / total) * 100)} do total
          </Kpi>
        ))}
      </div>
      {list.length ? (
        <DataTable
          caption="Gastos"
          rows={list}
          rowKey={g => g.id}
          columns={[
            { header: 'Data', cell: g => dataBR(g.data), className: 'whitespace-nowrap tabular-nums' },
            {
              header: 'Descrição',
              cell: g => (
                <NameCell
                  name={g.descricao}
                  after={<SampleChip show={g.exemplo} />}
                  sub={[g.loja, g.nf && 'NF ' + g.nf].filter(Boolean).join(' · ')}
                />
              ),
            },
            { header: 'Categoria', cell: g => <Chip>{g.categoria || 'Outros'}</Chip> },
            {
              header: 'Entrou no estoque',
              cell: g => {
                const ins = calc.insById(g.insumoId);
                return ins ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Chip tone="info">
                      +{fmt(g.qtd)} {ins.unidade || 'un'}
                    </Chip>
                    <Sub>{ins.nome}</Sub>
                  </span>
                ) : (
                  <Sub>—</Sub>
                );
              },
            },
            { header: 'Valor', numeric: true, cell: g => brl(num(g.valor)) },
            { header: 'Frete', numeric: true, cell: g => (num(g.frete) ? brl(num(g.frete)) : '—') },
            { header: 'Total', numeric: true, cell: g => <b>{brl(gastoTotal(g))}</b> },
            {
              header: '',
              cell: g => (
                <RowActions>
                  <Button size="sm" variant="ghost" onClick={() => openForm({ kind: 'gasto', id: g.id })}>
                    Editar
                  </Button>
                </RowActions>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState title={'Nenhum gasto ' + (k ? 'em ' + mesLabel(k) : 'lançado')} action={newButton}>
          Lance compras de material, equipamentos, fretes e assinaturas para saber quanto a loja gasta por mês.
        </EmptyState>
      )}
    </>
  );
}
