import { getRouteApi, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from '@/app/Shell';
import { Button, buttonClass } from '@/components/ui/Button';
import { Count } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { HeadingNote, PageHeader, Panel, Sub } from '@/components/ui/Layout';
import { MonthNav } from '@/components/ui/MonthNav';
import { Segmented } from '@/components/ui/Segmented';
import { HBar, Kpi } from '@/components/ui/Stats';
import { insStatus, totPedido, type Calc } from '@/domain/calc';
import { isPending, STATUS, type Tone } from '@/domain/constants';
import { COLLECTIONS } from '@/domain/types';
import { useCalc, useLoadSamples } from '@/data/queries';
import { useOpenForm, type FormRequest } from '@/features/forms/FormHost';
import { BuyButton } from '@/features/supplies/SuppliesPage';
import { cn } from '@/lib/cn';
import { dataBR, mesLabel, shiftMonth, thisMonth, today } from '@/lib/dates';
import { brl, fmt, num, pct, plural } from '@/lib/format';
import { SalesChart } from './SalesChart';

const route = getRouteApi('/');

export default function OverviewPage() {
  const calc = useCalc();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const month = search.mes ?? thisMonth();
  const prev = shiftMonth(month, -1);
  const r = calc.resumoMes(month);
  const before = calc.resumoMes(prev);
  const profit = calc.monthProfit(month);
  const profitBefore = calc.monthProfit(prev);
  const isEmpty = COLLECTIONS.every(c => !calc.db[c].length);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  // Profit can be negative, so compare it in R$ instead of percent.
  const profitDelta = profitBefore.orders
    ? `${profit.profit >= profitBefore.profit ? '▲' : '▼'} ${brl(Math.abs(profit.profit - profitBefore.profit))} vs ${mesLabel(prev)}`
    : 'sem vendas no mês anterior';
  const salesDelta = before.vendas
    ? `${r.vendas >= before.vendas ? '▲' : '▼'} ${pct(Math.abs(((r.vendas - before.vendas) / before.vendas) * 100))} vs ${mesLabel(prev)}`
    : 'sem vendas no mês anterior';
  const alerts = useAlerts(calc);

  return (
    <>
      {isEmpty && <Welcome />}
      <PageHeader
        eyebrow={greeting + '!'}
        title={
          <>
            Como a <em>lojinha</em> está indo
          </>
        }
        description="Resumo do mês: quanto entrou, quanto saiu e o que precisa da sua atenção."
        actions={<MonthNav value={month} onChange={m => navigate({ search: s => ({ ...s, mes: m === thisMonth() ? undefined : m }) })} />}
      />
      <nav aria-label="Ações rápidas" className="grid grid-cols-4 gap-3 max-2xl:grid-cols-2">
        <QuickAction kind="pedido" icon="pedidos" title="Novo pedido" sub="registrar uma venda" />
        <QuickAction kind="gasto" icon="gastos" title="Novo gasto" sub="compra ou despesa" />
        <QuickAction kind="producao" icon="producao" title="Registrar lote" sub="peças impressas" />
        <QuickAction kind="tarefa" icon="tarefas" title="Nova tarefa" sub="algo para lembrar" />
      </nav>
      <div className="grid grid-cols-[1.35fr_repeat(3,minmax(0,1fr))] gap-3.5 max-2xl:grid-cols-3 max-sm:grid-cols-2">
        <Kpi
          featured
          negative={profit.profit < 0}
          label="Lucro do mês"
          value={brl(profit.profit)}
          className="max-2xl:col-span-full"
          tip={
            <>
              <b>Lucro do mês</b>
              <br />
              Quanto as vendas renderam depois do custo das peças vendidas (materiais, perda, seu tempo e extras, como em Preços) e das
              taxas e do envio.
            </>
          }
        >
          <span>{profit.sales ? `margem ${pct(profit.margin)} · ${profitDelta}` : 'nenhuma venda neste mês'}</span>
          <span data-calc className="text-2xs/[1.4] opacity-85">
            vendas {brl(profit.sales)} − peças {brl(profit.goodsCost)} − taxas e envio {brl(profit.feesAndShipping)}
          </span>
        </Kpi>
        <Kpi label="Vendas" value={brl(r.vendas)}>
          <span className={cn(before.vendas && 'font-semibold text-fg')}>{salesDelta}</span>
        </Kpi>
        <Kpi
          label="Caixa do mês"
          value={brl(r.saldo)}
          negative={r.saldo < 0}
          tip={
            <>
              <b>Caixa do mês</b>
              <br />
              Dinheiro que entrou menos tudo o que saiu no mês (material, equipamentos, fretes…), mesmo que o material comprado ainda não
              tenha sido usado.
            </>
          }
        >
          recebido {brl(r.liquido)} − gastos {brl(r.gastos)}
        </Kpi>
        <Kpi label="Pedidos" value={r.n} className="max-sm:col-span-full">
          {r.n ? `ticket médio ${brl(r.ticket)}` : 'nenhum neste mês'}
        </Kpi>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-5 max-xl:grid-cols-1">
        <Panel title="Precisa de atenção" aside={<Count value={alerts.length} hot={alerts.length > 0} />}>
          <div className="flex flex-col gap-1">
            {alerts.length ? (
              alerts
            ) : (
              <div className="flex items-center gap-3 rounded-sm bg-surface-muted p-3.5 font-medium">
                <Icon name="check" />
                Tudo em dia: nenhum insumo acabando, nenhum pedido em aberto e fila de impressão vazia.
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Vendas × gastos" aside={<HeadingNote>últimos 6 meses</HeadingNote>}>
          <div className="-mt-1.5 mb-1.5 flex gap-4 text-xs text-fg-muted" aria-hidden="true">
            <span className="inline-flex items-center gap-2">
              <i className="size-[9px] rounded-full bg-chart-1" />
              Vendas
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="size-[9px] rounded-full bg-chart-2" />
              Gastos
            </span>
          </div>
          <SalesChart calc={calc} month={month} />
        </Panel>
      </div>
      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <ProductRanking
          calc={calc}
          month={month}
          byProfit={search.rank !== 'pecas'}
          onRank={rank => navigate({ search: s => ({ ...s, rank: rank === 'lucro' ? undefined : rank }) })}
        />
        <Channels month={month} orders={r.ped} />
      </div>
    </>
  );
}

function QuickAction({ kind, icon, title, sub }: { kind: FormRequest['kind']; icon: IconName; title: string; sub: string }) {
  const openForm = useOpenForm();
  return (
    <button
      type="button"
      onClick={() => openForm({ kind } as FormRequest)}
      className="group flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3.5 text-left font-semibold shadow-sm transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-border-strong max-sm:gap-2.5 max-sm:p-3 max-sm:text-sm"
    >
      <i className="grid size-10 flex-none place-items-center rounded-full bg-surface-muted text-fg transition-colors group-hover:bg-fg group-hover:text-bg">
        <Icon name={icon} />
      </i>
      <span>
        {title}
        <small className="block text-xs font-medium text-fg-subtle max-sm:hidden">{sub}</small>
      </span>
    </button>
  );
}

function Welcome() {
  const openForm = useOpenForm();
  const samples = useLoadSamples();
  return (
    <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6 rounded-md border border-border bg-surface p-7 max-sm:grid-cols-1 max-sm:p-6">
      <Logo className="size-22" />
      <div>
        <h2 className="mb-1.5 text-2xl font-bold tracking-tight">Boas-vindas ao painel</h2>
        <p className="mb-4 max-w-[62ch] text-fg-muted">
          Comece cadastrando seus insumos (papéis, bases de botton, embalagens) e depois os produtos. Se preferir, carregue dados de exemplo
          para ver tudo funcionando e apague depois em Ajustes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'insumo' })}>
            Primeiro insumo
          </Button>
          <Button onClick={samples.load} disabled={samples.isPending}>
            Carregar exemplos
          </Button>
        </div>
      </div>
    </section>
  );
}

const ALERT_ICON_TONE: Partial<Record<Tone, string>> = { bad: 'bg-fg text-bg' };

function Alert({ tone, icon, title, sub, action }: { tone: Tone; icon: IconName; title: ReactNode; sub: ReactNode; action: ReactNode }) {
  return (
    <div data-alert className="-mx-2.5 flex items-center gap-3 rounded-sm p-2.5 hover:bg-surface-sunken">
      <span
        className={cn(
          'grid size-9.5 flex-none place-items-center rounded-full bg-surface-muted text-fg [&_svg]:size-4.5',
          ALERT_ICON_TONE[tone],
        )}
      >
        <Icon name={icon} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <b className="leading-[1.35] font-semibold">{title}</b>
        <span className="line-clamp-2 text-xs text-fg-subtle">{sub}</span>
      </div>
      <div className="flex-none">{action}</div>
    </div>
  );
}

/** What needs an action, each item with the button that solves it. */
function useAlerts(calc: Calc): ReactNode[] {
  const openForm = useOpenForm();
  const out: ReactNode[] = [];
  const urgent = calc.tarefasUrgentes();
  if (urgent.length) {
    const late = urgent.filter(t => t.prazo! < today()).length;
    out.push(
      <Alert
        key="tasks"
        tone={late ? 'bad' : 'strong'}
        icon="tarefas"
        title={`${urgent.length} ${plural(urgent.length, 'tarefa')} para fazer${late ? ` · ${late} ${plural(late, 'atrasada')}` : ' hoje'}`}
        sub={
          urgent
            .slice(0, 3)
            .map(t => t.titulo)
            .join(', ') + (urgent.length > 3 ? '…' : '')
        }
        action={
          <Link to="/tarefas" className={buttonClass('default', 'sm')}>
            Ver
          </Link>
        }
      />,
    );
  }
  for (const o of calc.db.pedidos.filter(isPending).toSorted((a, b) => (a.data || '').localeCompare(b.data || ''))) {
    const s = STATUS[o.status];
    out.push(
      <Alert
        key={o.id}
        tone={s.tone}
        icon="pedidos"
        title={`Pedido ${o.numero ? '#' + o.numero : 's/ nº'} · ${s.label.toLowerCase()}`}
        sub={[o.cliente, o.canal, dataBR(o.data)].filter(Boolean).join(' · ')}
        action={
          <Button size="sm" onClick={() => openForm({ kind: 'pedido', id: o.id })}>
            Abrir
          </Button>
        }
      />,
    );
  }
  for (const i of calc.db.insumos) {
    const stock = calc.movIns(i).estoque;
    const [label, tone] = insStatus(i, stock);
    if (tone === 'good') continue;
    out.push(
      <Alert
        key={i.id}
        tone={tone}
        icon="insumos"
        title={`${i.nome} · ${label.toLowerCase()}`}
        sub={`${fmt(stock)} ${i.unidade || 'un'} em estoque${num(i.estoqueMin) ? `, mínimo ${fmt(i.estoqueMin)}` : ''}`}
        action={<BuyButton insumo={i} variant="default" />}
      />,
    );
  }
  const queue = calc.db.produtos.filter(p => num(p.qtdImprimir) > 0);
  if (queue.length) {
    out.push(
      <Alert
        key="queue"
        tone="info"
        icon="producao"
        title={`${queue.reduce((a, p) => a + num(p.qtdImprimir), 0)} peças na fila de impressão`}
        sub={queue.map(p => p.nome).join(', ')}
        action={
          <Link to="/catalogo" search={{ fila: true }} className={buttonClass('default', 'sm')}>
            Ver fila
          </Link>
        }
      />,
    );
  }
  return out;
}

function ProductRanking({
  calc,
  month,
  byProfit,
  onRank,
}: {
  calc: Calc;
  month: string;
  byProfit: boolean;
  onRank: (r: 'lucro' | 'pecas') => void;
}) {
  const ranked = Object.entries(calc.monthProfit(month).byProduct)
    .toSorted((a, b) => (byProfit ? b[1].profit - a[1].profit : b[1].qty - a[1].qty))
    .slice(0, 6);
  const value = (x: { profit: number; qty: number }) => (byProfit ? x.profit : x.qty);
  const max = Math.max(1e-9, ...ranked.map(([, x]) => Math.max(0, value(x))));
  return (
    <Panel
      title={`Produtos em ${mesLabel(month)}`}
      aside={
        <Segmented
          label="Ordenar produtos"
          size="sm"
          className="ml-auto"
          value={byProfit ? 'lucro' : 'pecas'}
          onChange={onRank}
          options={[
            { value: 'lucro', label: 'Lucro' },
            { value: 'pecas', label: 'Peças' },
          ]}
        />
      }
    >
      {ranked.length ? (
        <>
          {ranked.map(([id, x]) => {
            const v = value(x);
            const margin = x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0;
            return (
              <HBar
                key={id}
                ratio={Math.max(0, v) / max}
                negative={v < 0}
                value={byProfit ? brl(v) : fmt(v, 0)}
                label={
                  <span data-rank className="flex min-w-0 flex-col leading-snug">
                    <span className="truncate">{calc.prodById(id)?.nome || 'Produto removido'}</span>
                    <small className="truncate text-xs text-fg-subtle">
                      {byProfit ? `${fmt(x.qty, 0)} ${plural(x.qty, 'peça')} · margem ${pct(margin)}` : `${brl(x.revenue)} em vendas`}
                    </small>
                  </span>
                }
              />
            );
          })}
          {byProfit && (
            <Sub className="mt-2.5">Lucro de cada produto = vendas − custo das peças − parte das taxas e descontos do pedido.</Sub>
          )}
        </>
      ) : (
        <Sub>Nenhuma venda registrada neste mês.</Sub>
      )}
    </Panel>
  );
}

function Channels({ month, orders }: { month: string; orders: ReturnType<Calc['resumoMes']>['ped'] }) {
  const byChannel = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      const c = o.canal || 'Sem canal';
      acc[c] = (acc[c] || 0) + totPedido(o).total;
      return acc;
    }, {}),
  ).toSorted((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...byChannel.map(x => x[1]));
  return (
    <Panel title="Vendas por canal" aside={<HeadingNote>{mesLabel(month)}</HeadingNote>}>
      {byChannel.length ? (
        byChannel.map(([c, v]) => (
          <HBar key={c} variant="secondary" ratio={v / max} value={brl(v)} label={<span className="block truncate">{c}</span>} />
        ))
      ) : (
        <Sub>Nenhuma venda registrada neste mês.</Sub>
      )}
    </Panel>
  );
}
