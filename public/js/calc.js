/* Business calculations: supply cost and stock, product cost and price, order totals,
   the month summary and the monthly profit. Pure functions of the data in `S`. */

/* While a screen is being drawn the data can't change, so expensive results are cached for
   the duration of one render (see render() in app.js). Outside a render nothing is cached. */
let renderCache = null;
const cached = (key, compute) => {
  if (!renderCache) return compute();
  if (!renderCache.has(key)) renderCache.set(key, compute());
  return renderCache.get(key);
};
function withRenderCache(fn) {
  renderCache = new Map();
  try {
    return fn();
  } finally {
    renderCache = null;
  }
}

const DEFAULTS = { valorHora: 20, margem: 100, taxa: 12, perda: 5, nomeLoja: 'Minha lojinha' };
const cfg = () => ({ ...DEFAULTS, ...S.config });

/** Supply cost per unit: average of its purchases ((price + shipping) ÷ quantity), else the typed cost. */
function custoUnit(ins) {
  return cached('custoUnit:' + ins.id, () => {
    const compras = S.gastos.filter(g => g.insumoId === ins.id && num(g.qtd) > 0);
    if (!compras.length) return { valor: num(ins.custoManual), fonte: 'manual', n: 0 };
    const qtd = compras.reduce((a, g) => a + num(g.qtd), 0);
    const total = compras.reduce((a, g) => a + gastoTotal(g), 0);
    return { valor: total / qtd, fonte: 'compras', n: compras.length };
  });
}

/** Supply movement: bought (Gastos), used (production batches) and what is left. */
function movIns(ins) {
  return cached('movIns:' + ins.id, () => {
    let comprado = 0;
    let usado = 0;
    S.gastos.forEach(g => {
      if (g.insumoId === ins.id) comprado += num(g.qtd);
    });
    S.producoes.forEach(p =>
      (p.consumo || []).forEach(c => {
        if (c.insumoId === ins.id) usado += num(c.qtd);
      }),
    );
    return { comprado, usado, estoque: num(ins.estoqueInicial) + comprado - usado };
  });
}

/** [label, tone] of a supply's stock level. */
function insStatus(ins, estoque) {
  const min = num(ins.estoqueMin);
  if (estoque <= 0) return ['Acabou', 'bad'];
  if (min > 0 && estoque <= min) return ['Repor', 'warn'];
  return ['Ok', 'good'];
}

/** Per-unit quantity of a recipe line: "1 sheet makes 12 pieces" uses 1/12 sheet per piece. */
const perPiece = it => num(it.qtd) / (num(it.rende) || 1);

/**
 * Product cost and price. `over` lets the product form preview unsaved values.
 * total = materials + waste + labor + extras; suggested = total × (1 + margin) ÷ (1 − fee),
 * rounded up to end in ,90.
 */
function custo(p, over) {
  const c = cfg();
  p = over || p;
  let mat = 0;
  const linhas = (p.insumos || []).map(it => {
    const ins = insById(it.insumoId);
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
  const margemReal = preco > 0 ? (lucro / preco) * 100 : 0;
  return { linhas, mat, perda, mo, extra, total, margem, taxa, sugerido, redondo, preco, lucro, margemReal, manual };
}
const productCost = p => cached('custo:' + p.id, () => custo(p));

/** Ready pieces: initial stock + produced batches − ordered pieces (cancelled orders excluded). */
function estoqueProd(p) {
  let e = num(p.estoqueInicial);
  S.producoes.forEach(x => {
    if (x.produtoId === p.id) e += num(x.qtd);
  });
  S.pedidos.filter(isCounted).forEach(o =>
    (o.itens || []).forEach(i => {
      if (i.produtoId === p.id) e -= num(i.qtd);
    }),
  );
  return e;
}

function totPedido(o) {
  const itens = o.itens || [];
  const sub = itens.reduce((a, i) => a + num(i.qtd) * num(i.preco), 0);
  const total = sub + num(o.freteCobrado) - num(o.desconto);
  return {
    sub,
    total,
    liquido: total - num(o.taxaValor) - num(o.custoEnvio),
    pecas: itens.reduce((a, i) => a + num(i.qtd), 0),
  };
}
const gastoTotal = g => num(g.valor) + num(g.frete);
const sum = (list, fn) => list.reduce((a, x) => a + fn(x), 0);

/** The month's orders that count as sales (cancelled ones excluded). */
const monthOrders = k => S.pedidos.filter(o => inMonth(o, k) && isCounted(o));

/** Month cash summary: sales, money received, expenses and the balance between them. */
function resumoMes(k) {
  return cached('resumoMes:' + k, () => {
    const ped = monthOrders(k);
    const gas = S.gastos.filter(g => inMonth(g, k));
    const vendas = sum(ped, o => totPedido(o).total);
    const liquido = sum(ped, o => totPedido(o).liquido);
    const gastos = sum(gas, gastoTotal);
    return {
      ped,
      gas,
      vendas,
      liquido,
      gastos,
      saldo: liquido - gastos,
      n: ped.length,
      ticket: ped.length ? vendas / ped.length : 0,
    };
  });
}

// Monthly profit: what the month's sales really earned after the cost of the pieces sold.
// Piece cost uses the same definition as the pricing screen (materials + waste + labor + extras),
// at today's supply costs. Order-level fees and discounts are split among the order's items by
// revenue, so the per-product profits plus net shipping add up exactly to the month's profit.
function monthProfit(k) {
  return cached('monthProfit:' + k, () => {
    const orders = monthOrders(k);
    const unitCost = {};
    const costOf = id => {
      if (!(id in unitCost)) {
        const p = prodById(id);
        unitCost[id] = p ? productCost(p).total : 0;
      }
      return unitCost[id];
    };
    let sales = 0;
    let net = 0;
    let goodsCost = 0;
    let shippingNet = 0;
    const byProduct = {};
    orders.forEach(o => {
      const t = totPedido(o);
      sales += t.total;
      net += t.liquido;
      shippingNet += num(o.freteCobrado) - num(o.custoEnvio);
      const deductRate = t.sub > 0 ? (num(o.taxaValor) + num(o.desconto)) / t.sub : 0;
      (o.itens || []).forEach(i => {
        const qty = num(i.qtd);
        const revenue = qty * num(i.preco);
        const cost = qty * costOf(i.produtoId);
        goodsCost += cost;
        const rowP = byProduct[i.produtoId] || (byProduct[i.produtoId] = { qty: 0, revenue: 0, profit: 0 });
        rowP.qty += qty;
        rowP.revenue += revenue;
        rowP.profit += revenue * (1 - deductRate) - cost;
      });
    });
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
}

/** Supplies a production batch of `q` pieces of product `p` consumes. */
const consumoDe = (p, q) =>
  (p?.insumos || []).filter(it => it.insumoId).map(it => ({ insumoId: it.insumoId, qtd: perPiece(it) * q }));

/* ---------- tasks ---------- */
/** Open tasks due today or earlier, oldest first. */
function tarefasUrgentes() {
  return cached('urgentes', () => {
    const h = today();
    return S.tarefas.filter(t => !t.feito && t.prazo && t.prazo <= h).sort((a, b) => a.prazo.localeCompare(b.prazo));
  });
}

function prazoLabel(p) {
  if (!p) return '';
  const h = today();
  if (p === h) return 'Hoje';
  if (p === addDays(h, 1)) return 'Amanhã';
  if (p === addDays(h, -1)) return 'Ontem';
  const [y, m, d] = p.split('-');
  return d + '/' + m + (y !== h.slice(0, 4) ? '/' + y.slice(2) : '');
}
