import { getRouteApi } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Chip, SampleChip } from '@/components/ui/Chip';
import { controlClass } from '@/components/ui/Field';
import { EmptyState, Note, PageHeader, Sub } from '@/components/ui/Layout';
import { DataTable, NameCell, RowActions } from '@/components/ui/Table';
import { toast } from '@/components/ui/toast';
import { totPedido } from '@/domain/calc';
import { CANAIS, isCounted, isInProgress, STATUS, STATUS_OPTIONS } from '@/domain/constants';
import type { OrderStatus, Pedido } from '@/domain/types';
import { useCalc, useSave } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { cn } from '@/lib/cn';
import { dataBR } from '@/lib/dates';
import { brl, fmt, plural } from '@/lib/format';

const route = getRouteApi('/pedidos');
const filterClass = cn(controlClass, 'w-auto rounded-full px-3.5 py-2');

export default function OrdersPage() {
  const calc = useCalc();
  const openForm = useOpenForm();
  const { save } = useSave();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const status = search.status ?? 'abertos';
  const canal = search.canal ?? '';

  const orders = calc.db.pedidos
    .filter(o => (status === 'abertos' ? isInProgress(o) : !status || o.status === status))
    .filter(o => !canal || o.canal === canal)
    .toSorted((a, b) => (b.data || '').localeCompare(a.data || '') || (b.numero || '').localeCompare(a.numero || ''));
  const channels = [...new Set([...CANAIS, ...calc.db.pedidos.map(o => o.canal).filter((c): c is string => !!c)])];
  const withoutInvoice = calc.db.pedidos.filter(o => isCounted(o) && !o.nf).length;

  const changeStatus = async (o: Pedido, next: OrderStatus) => {
    try {
      await save('pedidos', { ...o, status: next });
      toast('Status: ' + STATUS[next].label);
    } catch {
      /* already reported */
    }
  };
  const newButton = (
    <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'pedido' })}>
      Novo pedido
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Cada venda, por onde veio, quanto rendeu de verdade e a nota fiscal. Pedidos baixam o estoque de peças prontas."
        actions={
          <>
            <select
              aria-label="Filtrar status"
              className={filterClass}
              value={status}
              onChange={e => navigate({ search: s => ({ ...s, status: e.target.value === 'abertos' ? undefined : e.target.value }) })}
            >
              <option value="abertos">Em andamento</option>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar canal"
              className={filterClass}
              value={canal}
              onChange={e => navigate({ search: s => ({ ...s, canal: e.target.value || undefined }) })}
            >
              <option value="">Todos os canais</option>
              {channels.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            {newButton}
          </>
        }
      />
      {withoutInvoice > 0 && (
        <Note tone="warn">
          {withoutInvoice} {plural(withoutInvoice, 'pedido')} sem nota fiscal registrada.
        </Note>
      )}
      {orders.length ? (
        <DataTable
          caption="Pedidos"
          rows={orders}
          rowKey={o => o.id}
          columns={[
            { header: 'Data', cell: o => dataBR(o.data), className: 'whitespace-nowrap tabular-nums' },
            {
              header: 'Pedido',
              cell: o => <NameCell name={'#' + (o.numero || '—')} after={<SampleChip show={o.exemplo} />} sub={o.cliente} />,
            },
            { header: 'Canal', cell: o => o.canal || '—' },
            {
              header: 'Itens',
              cell: o => (
                <Sub className="max-w-[300px] min-w-[200px]">
                  {(o.itens || []).map(i => `${fmt(i.qtd, 0)}× ${calc.prodById(i.produtoId)?.nome || 'produto removido'}`).join(', ') ||
                    '—'}
                </Sub>
              ),
            },
            {
              header: 'Total',
              numeric: true,
              cell: o => {
                const t = totPedido(o);
                return (
                  <>
                    <b>{brl(t.total)}</b>
                    <Sub>líquido {brl(t.liquido)}</Sub>
                  </>
                );
              },
            },
            { header: 'Nota fiscal', cell: o => (o.nf ? <Chip tone="good">NF {o.nf}</Chip> : <Chip tone="warn">sem NF</Chip>) },
            {
              header: 'Status',
              cell: o => (
                <select
                  aria-label={`Status do pedido #${o.numero || ''}`}
                  className={cn(controlClass, 'w-auto rounded-full px-3 py-[5px] text-xs')}
                  value={o.status}
                  onChange={e => changeStatus(o, e.target.value as OrderStatus)}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              header: '',
              cell: o => (
                <RowActions>
                  <Button size="sm" variant="ghost" onClick={() => openForm({ kind: 'pedido', id: o.id })}>
                    Editar
                  </Button>
                </RowActions>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState title={calc.db.pedidos.length ? 'Nenhum pedido com esse filtro' : 'Nenhum pedido ainda'} action={newButton}>
          Registre as vendas de cada canal para acompanhar faturamento e estoque.
        </EmptyState>
      )}
    </>
  );
}
