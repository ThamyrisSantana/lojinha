/* Business calculations: supply cost and stock, product cost and price, order totals,
   the month summary and the monthly profit. Pure functions of the data (`Db`).

   createCalc(db) returns the calculations bound to one version of the data, with expensive
   results cached. The data is immutable (every change creates a new Db), so a cache can never
   go stale: a new Db gets a new calculator (see useCalc()). */
import { inMonth, today } from '@/lib/dates';
import { filled, num } from '@/lib/format';
import { isCounted, priorityOf } from './constants';
import type { Config, Consumo, Db, Gasto, Insumo, Pedido, Produto, RecipeLine, Tarefa } from './types';

const DEFAULTS = { valorHora: 20, margem: 100, taxa: 12, perda: 5, nomeLoja: 'Minha lojinha' };
/** Settings with the defaults filled in (values may still be text typed by the user). */
export type Settings = { nomeLoja: string } & Required<Omit<Config, 'nomeLoja'>>;

export const gastoTotal = (g: Gasto): number => num(g.valor) + num(g.frete);
const sum = <T>(list: T[], fn: (x: T) => number): number => list.reduce((a, x) => a + fn(x), 0);
/** Per-piece quantity of a recipe line: "1 sheet makes 12 pieces" uses 1/12 sheet per piece. */
export const perPiece = (it: Pick<RecipeLine, 'qtd' | 'rende'>): number => num(it.qtd) / (num(it.rende) || 1);

/** [label, tone] of a supply's stock level. */
export function insStatus(ins: Insumo, estoque: number): ['Acabou' | 'Repor' | 'Ok', 'bad' | 'warn' | 'good'] {
  const min = num(ins.estoqueMin);
  if (estoque <= 0) return ['Acabou', 'bad'];
  if (min > 0 && estoque <= min) return ['Repor', 'warn'];
  return ['Ok', 'good'];
}

export interface OrderTotals {
  sub: number;
  total: number;
  liquido: number;
  pecas: number;
}
export function totPedido(o: Pick<Pedido, 'itens' | 'freteCobrado' | 'desconto' | 'taxaValor' | 'custoEnvio'>): OrderTotals {
  const itens = o.itens || [];
  const sub = sum(itens, i => num(i.qtd) * num(i.preco));
  const total = sub + num(o.freteCobrado) - num(o.desconto);
  return { sub, total, liquido: total - num(o.taxaValor) - num(o.custoEnvio), pecas: sum(itens, i => num(i.qtd)) };
}

/** Task sort: due date, then priority (high first), then creation. */
/** Order of the tasks in a list: the order the user set by dragging comes first; tasks never
 *  moved go after them, by due date, then priority, then creation. */
export const taskOrder = (a: Tarefa, b: Tarefa): number =>
  (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER) ||
  (a.prazo || '9999').localeCompare(b.prazo || '9999') ||
  priorityOf(b).weight - priorityOf(a).weight ||
  (a.criadoEm || '').localeCompare(b.criadoEm || '');

/** Moves the task at `from` to `to` in a list as shown, and returns the tasks to save: every
 *  task of the list gets its new position (1, 2, 3…), and only those whose position changed are returned. */
export function moveTask(list: Tarefa[], from: number, to: number): Tarefa[] {
  if (from === to || !list[from] || !list[to]) return [];
  const next = list.toSpliced(from, 1).toSpliced(to, 0, list[from]);
  return next.flatMap((t, i) => (t.ordem === i + 1 ? [] : [{ ...t, ordem: i + 1 }]));
}

export interface ProductCost {
  linhas: (RecipeLine & { ins?: Insumo; q: number; u: number; sub: number })[];
  mat: number;
  perda: number;
  mo: number;
  extra: number;
  total: number;
  margem: number;
  taxa: number;
  sugerido: number;
  redondo: number;
  preco: number;
  lucro: number;
  margemReal: number;
  manual: boolean;
}

export interface MonthSummary {
  ped: Pedido[];
  gas: Gasto[];
  vendas: number;
  liquido: number;
  gastos: number;
  saldo: number;
  n: number;
  ticket: number;
}

export interface MonthProfit {
  sales: number;
  net: number;
  goodsCost: number;
  feesAndShipping: number;
  profit: number;
  margin: number;
  shippingNet: number;
  byProduct: Record<string, { qty: number; revenue: number; profit: number }>;
  orders: number;
}

export function createCalc(db: Db) {
  const cache = new Map<string, unknown>();
  const cached = <T>(key: string, compute: () => T): T => {
    if (!cache.has(key)) cache.set(key, compute());
    return cache.get(key) as T;
  };
  const insById = new Map(db.insumos.map(i => [i.id, i]));
  const prodById = new Map(db.produtos.map(p => [p.id, p]));

  const cfg = (): Settings => ({ ...DEFAULTS, ...db.config, nomeLoja: db.config.nomeLoja || DEFAULTS.nomeLoja });

  /** Supply cost per unit: average of its purchases ((price + shipping) ÷ quantity), else the typed cost. */
  const custoUnit = (ins: Insumo) =>
    cached('custoUnit:' + ins.id, () => {
      const compras = db.gastos.filter(g => g.insumoId === ins.id && num(g.qtd) > 0);
      if (!compras.length) return { valor: num(ins.custoManual), fonte: 'manual' as const, n: 0 };
      const qtd = sum(compras, g => num(g.qtd));
      return { valor: sum(compras, gastoTotal) / qtd, fonte: 'compras' as const, n: compras.length };
    });

  /** Supply movement: bought (Gastos), used (production batches) and what is left. */
  const movIns = (ins: Insumo) =>
    cached('movIns:' + ins.id, () => {
      const comprado = sum(
        db.gastos.filter(g => g.insumoId === ins.id),
        g => num(g.qtd),
      );
      const usado = sum(db.producoes, p =>
        sum(
          (p.consumo || []).filter(c => c.insumoId === ins.id),
          c => num(c.qtd),
        ),
      );
      return { comprado, usado, estoque: num(ins.estoqueInicial) + comprado - usado };
    });

  /**
   * Product cost and price. total = materials + waste + labor + extras;
   * suggested = total × (1 + margin) ÷ (1 − fee), rounded up to end in ,90.
   * Pass unsaved form values to preview them (not cached).
   */
  const custoOf = (p: Partial<Produto>): ProductCost => {
    const c = cfg();
    let mat = 0;
    const linhas = (p.insumos || []).map(it => {
      const ins = insById.get(it.insumoId);
      const q = perPiece(it);
      const u = ins ? custoUnit(ins).valor : 0;
      mat += q * u;
      return { ...it, ins, q, u, sub: q * u };
    });
    const perda = (mat * num(c.perda)) / 100;
    const mo = (num(p.tempoMin) / 60) * num(c.valorHora);
    const extra = num(p.custoExtra);
    const total = mat + perda + mo + extra;
    const margem = num(filled(p.margem) ? p.margem : c.margem);
    const taxa = num(filled(p.taxa) ? p.taxa : c.taxa);
    const sugerido = taxa < 100 ? (total * (1 + margem / 100)) / (1 - taxa / 100) : 0;
    const redondo = sugerido > 0 ? Math.ceil(sugerido + 0.1) - 0.1 : 0;
    const manual = num(p.preco) > 0;
    const preco = manual ? num(p.preco) : redondo;
    const lucro = preco * (1 - taxa / 100) - total;
    return {
      linhas,
      mat,
      perda,
      mo,
      extra,
      total,
      margem,
      taxa,
      sugerido,
      redondo,
      preco,
      lucro,
      margemReal: preco > 0 ? (lucro / preco) * 100 : 0,
      manual,
    };
  };
  const custo = (p: Produto) => cached('custo:' + p.id, () => custoOf(p));

  /** Ready pieces: initial stock + produced batches − ordered pieces (cancelled orders excluded). */
  const estoqueProd = (p: Produto) =>
    num(p.estoqueInicial) +
    sum(
      db.producoes.filter(x => x.produtoId === p.id),
      x => num(x.qtd),
    ) -
    sum(db.pedidos.filter(isCounted), o =>
      sum(
        (o.itens || []).filter(i => i.produtoId === p.id),
        i => num(i.qtd),
      ),
    );

  /** The month's orders that count as sales. */
  const monthOrders = (k: string) => db.pedidos.filter(o => inMonth(o, k) && isCounted(o));

  /** Month cash summary: sales, money received, expenses and the balance between them. */
  const resumoMes = (k: string): MonthSummary =>
    cached('resumoMes:' + k, () => {
      const ped = monthOrders(k);
      const gas = db.gastos.filter(g => inMonth(g, k));
      const vendas = sum(ped, o => totPedido(o).total);
      const liquido = sum(ped, o => totPedido(o).liquido);
      const gastos = sum(gas, gastoTotal);
      return { ped, gas, vendas, liquido, gastos, saldo: liquido - gastos, n: ped.length, ticket: ped.length ? vendas / ped.length : 0 };
    });

  // Monthly profit: what the month's sales really earned after the cost of the pieces sold.
  // Piece cost uses the same definition as the pricing screen, at today's supply costs.
  // Order fees and discounts are split among the order's items by revenue, so the per-product
  // profits plus net shipping add up exactly to the month's profit.
  const monthProfit = (k: string): MonthProfit =>
    cached('monthProfit:' + k, () => {
      const orders = monthOrders(k);
      const costOf = (id: string) => {
        const p = prodById.get(id);
        return p ? custo(p).total : 0;
      };
      let sales = 0;
      let net = 0;
      let goodsCost = 0;
      let shippingNet = 0;
      const byProduct: MonthProfit['byProduct'] = {};
      for (const o of orders) {
        const t = totPedido(o);
        sales += t.total;
        net += t.liquido;
        shippingNet += num(o.freteCobrado) - num(o.custoEnvio);
        const deductRate = t.sub > 0 ? (num(o.taxaValor) + num(o.desconto)) / t.sub : 0;
        for (const i of o.itens || []) {
          const qty = num(i.qtd);
          const revenue = qty * num(i.preco);
          const cost = qty * costOf(i.produtoId);
          goodsCost += cost;
          const row = (byProduct[i.produtoId] ??= { qty: 0, revenue: 0, profit: 0 });
          row.qty += qty;
          row.revenue += revenue;
          row.profit += revenue * (1 - deductRate) - cost;
        }
      }
      const profit = net - goodsCost;
      return {
        sales,
        net,
        goodsCost,
        feesAndShipping: sales - net,
        profit,
        margin: sales > 0 ? (profit / sales) * 100 : 0,
        shippingNet,
        byProduct,
        orders: orders.length,
      };
    });

  /** Supplies a production batch of `q` pieces of product `p` consumes. */
  const consumoDe = (p: Produto | undefined, q: number): Consumo[] =>
    (p?.insumos || []).filter(it => it.insumoId).map(it => ({ insumoId: it.insumoId, qtd: perPiece(it) * q }));

  /** Open tasks due today or earlier, oldest first. */
  const tarefasUrgentes = () =>
    cached('urgentes', () => {
      const h = today();
      return db.tarefas.filter(t => !t.feito && t.prazo && t.prazo <= h).sort((a, b) => a.prazo!.localeCompare(b.prazo!));
    });

  return {
    db,
    cfg,
    insById: (id?: string) => (id ? insById.get(id) : undefined),
    prodById: (id?: string) => (id ? prodById.get(id) : undefined),
    custoUnit,
    movIns,
    custo,
    custoOf,
    estoqueProd,
    resumoMes,
    monthProfit,
    consumoDe,
    tarefasUrgentes,
  };
}
export type Calc = ReturnType<typeof createCalc>;
