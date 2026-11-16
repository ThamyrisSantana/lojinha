// Unit tests for the dashboard's calculations (public/app.js), run with Node's built-in test runner.
// Expected values are worked out by hand in the comments, from the rules in the README.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./load-app');

const close = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-6, `${msg || ''} expected ${expected}, got ${actual}`);
const NBSP = ' ';

// Fixture: two supplies, two products, purchases, a batch, orders and expenses.
// Default settings: hourly rate R$20, margin 100%, platform fee 12%, waste 5%.
function fixture() {
  return {
    insumos: [
      { id: 'paper', nome: 'Papel', unidade: 'folha', custoManual: '2' },                       // no purchases → manual cost 2
      { id: 'base', nome: 'Base botton', unidade: 'un', estoqueInicial: '10', estoqueMin: '50' }, // cost from purchases
    ],
    produtos: [
      // materials: paper 1/4 sheet × 2 = 0.50, base 1 × 0.6667 → 1.1667; waste 5% → 0.0583;
      // labor 6 min → 2.00; extras 0.30 → total 3.525
      { id: 'botton', nome: 'Botton', tempoMin: '6', custoExtra: '0,30', estoqueInicial: '5',
        insumos: [{ insumoId: 'paper', qtd: '1', rende: '4' }, { insumoId: 'base', qtd: '1', rende: '1' }] },
      { id: 'card', nome: 'Cartão', tempoMin: '0', custoExtra: '1', insumos: [] },               // total 1.00
    ],
    gastos: [
      { id: 'g1', data: '2026-10-01', valor: '50', frete: '10', insumoId: 'base', qtd: '100' },
      { id: 'g2', data: '2026-10-15', valor: '40', frete: '', insumoId: 'base', qtd: '50' },     // base: (60 + 40) / 150 = 0.6667
      { id: 'g3', data: '2026-09-10', valor: '25', frete: '0' },
    ],
    producoes: [
      { id: 'p1', data: '2026-10-02', produtoId: 'botton', qtd: 10, consumo: [{ insumoId: 'base', qtd: 20 }] },
    ],
    pedidos: [
      // subtotal 2 × 8.90 + 1 × 5 = 22.80; + shipping charged 10 − discount 2.80 = 30.00;
      // − platform fee 3 − real shipping 8 = net 19.00
      { id: 'o1', data: '2026-10-05', status: 'novo', freteCobrado: '10', desconto: '2,80', taxaValor: '3', custoEnvio: '8',
        itens: [{ produtoId: 'botton', qtd: '2', preco: '8,90' }, { produtoId: 'card', qtd: '1', preco: '5' }] },
      { id: 'o2', data: '2026-10-07', status: 'cancelado', itens: [{ produtoId: 'botton', qtd: '2', preco: '50' }] },
      { id: 'o3', data: '2026-09-20', status: 'entregue', itens: [{ produtoId: 'card', qtd: '4', preco: '5' }] },
    ],
    tarefas: [],
  };
}

describe('formatting helpers', () => {
  const app = loadApp();
  test('num() reads Brazilian decimals and treats junk as zero', () => {
    assert.equal(app.num('1,5'), 1.5);
    assert.equal(app.num(' 2 '), 2);
    assert.equal(app.num(3), 3);
    assert.equal(app.num(''), 0);
    assert.equal(app.num(null), 0);
    assert.equal(app.num('abc'), 0);
  });
  test('brl(), pct(), fmt() use pt-BR formatting', () => {
    assert.equal(app.brl(1234.5), `R$${NBSP}1.234,50`);
    assert.equal(app.brl(NaN), `R$${NBSP}0,00`);
    assert.equal(app.pct(69.64), '69,6%');
    assert.equal(app.fmt(1234.567), '1.234,57');
  });
  test('month and date labels', () => {
    assert.equal(app.mesLabel('2026-10'), 'out/26');
    assert.equal(app.dataBR('2026-10-05'), '05/10/2026');
    assert.equal(app.dataBR(''), '—');
  });
  test('shiftMonth() crosses year boundaries', () => {
    assert.equal(app.shiftMonth('2026-01', -1), '2025-12');
    assert.equal(app.shiftMonth('2026-12', 1), '2027-01');
    assert.equal(app.shiftMonth('2026-03', -15), '2024-12');
  });
  test('esc() escapes HTML', () => {
    assert.equal(app.esc('<b>"Tom & Jerry\'s"</b>'), '&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;');
  });
});

describe('supplies', () => {
  const app = loadApp();
  app.setData(fixture());
  test('custoUnit() uses the manual cost when there are no purchases', () => {
    const c = app.custoUnit(app.insById('paper'));
    assert.equal(c.fonte, 'manual');
    assert.equal(c.valor, 2);
  });
  test('custoUnit() averages purchases including shipping', () => {
    const c = app.custoUnit(app.insById('base'));
    assert.equal(c.fonte, 'compras');
    assert.equal(c.n, 2);
    close(c.valor, 100 / 150);
  });
  test('movIns(): initial stock + purchases − what batches consumed', () => {
    const m = app.movIns(app.insById('base'));
    assert.deepEqual({ ...m }, { comprado: 150, usado: 20, estoque: 140 });
  });
  test('insStatus(): ok, restock at the minimum, out at zero', () => {
    const base = app.insById('base');
    assert.equal(app.insStatus(base, 140)[0], 'Ok');
    assert.equal(app.insStatus(base, 50)[0], 'Repor');
    assert.equal(app.insStatus(base, 0)[0], 'Acabou');
  });
});

describe('product cost and price', () => {
  const app = loadApp();
  app.setData(fixture());
  test('custo() adds materials (with yield), waste, labor and extras', () => {
    const k = app.custo(app.prodById('botton'));
    close(k.mat, 0.5 + 100 / 150);
    close(k.perda, (0.5 + 100 / 150) * 0.05);
    close(k.mo, 2);
    close(k.extra, 0.3);
    close(k.total, 3.525);
  });
  test('suggested price = cost × (1 + margin) ÷ (1 − fee), rounded up to end in ,90', () => {
    const k = app.custo(app.prodById('botton'));
    close(k.sugerido, 3.525 * 2 / 0.88);   // 8.0114
    close(k.redondo, 8.9);
    close(k.preco, 8.9);
    assert.equal(k.manual, false);
    close(k.lucro, 8.9 * 0.88 - 3.525);     // 4.307
    close(k.margemReal, (8.9 * 0.88 - 3.525) / 8.9 * 100);
  });
  test('a price set by hand wins over the suggestion', () => {
    const k = app.custo({ ...app.prodById('botton'), preco: '10,00' });
    assert.equal(k.manual, true);
    close(k.preco, 10);
  });
  test('a product can override the default margin', () => {
    const k = app.custo({ ...app.prodById('botton'), margem: '50' });
    close(k.sugerido, 3.525 * 1.5 / 0.88);  // 6.0085
    close(k.redondo, 6.9);
  });
  test('changing the hourly rate in settings changes the cost', () => {
    app.S.config = { valorHora: '40' };
    close(app.custo(app.prodById('botton')).mo, 4);
    app.S.config = {};
  });
  test('estoqueProd(): initial + produced − ordered, ignoring cancelled orders', () => {
    assert.equal(app.estoqueProd(app.prodById('botton')), 5 + 10 - 2);
  });
});

describe('orders, month summary and profit', () => {
  const app = loadApp();
  app.setData(fixture());
  test('totPedido(): subtotal, total and net after fee and shipping', () => {
    const t = app.totPedido(app.S.pedidos[0]);
    close(t.sub, 22.8);
    close(t.total, 30);
    close(t.liquido, 19);
    assert.equal(t.pecas, 3);
  });
  test('resumoMes(): sales, net, expenses and cash for one month', () => {
    const r = app.resumoMes('2026-10');
    assert.equal(r.n, 1);                    // the cancelled order is ignored
    close(r.vendas, 30);
    close(r.liquido, 19);
    close(r.gastos, 100);                    // 60 + 40 (September's expense is ignored)
    close(r.saldo, -81);
    close(r.ticket, 30);
  });
  test('monthProfit(): sales − cost of pieces sold − fees and shipping', () => {
    const p = app.monthProfit('2026-10');
    close(p.sales, 30);
    close(p.goodsCost, 2 * 3.525 + 1);       // 8.05
    close(p.feesAndShipping, 11);
    close(p.profit, 19 - 8.05);              // 10.95
    close(p.margin, 10.95 / 30 * 100);
    assert.equal(p.orders, 1);
  });
  test('monthProfit(): order fees and discounts are split among items by revenue', () => {
    const p = app.monthProfit('2026-10');
    const rate = (3 + 2.8) / 22.8;
    close(p.byProduct.botton.profit, 17.8 * (1 - rate) - 7.05);
    close(p.byProduct.card.profit, 5 * (1 - rate) - 1);
    assert.equal(p.byProduct.botton.qty, 2);
  });
  test('monthProfit(): product profits plus net shipping add up to the month profit', () => {
    const p = app.monthProfit('2026-10');
    const sum = Object.values(p.byProduct).reduce((a, x) => a + x.profit, 0) + p.shippingNet;
    close(sum, p.profit);
  });
  test('monthProfit(): a month without sales is all zeros', () => {
    const p = app.monthProfit('2026-11');
    assert.deepEqual([p.sales, p.profit, p.margin, p.orders], [0, 0, 0, 0]);
  });
  test('monthProfit(): a removed product counts as zero cost', () => {
    app.S.pedidos.push({ id: 'o4', data: '2026-08-01', status: 'novo', itens: [{ produtoId: 'gone', qtd: '1', preco: '7' }] });
    close(app.monthProfit('2026-08').profit, 7);
    app.S.pedidos.pop();
  });
});

describe('tasks and dates (clock fixed at 2026-10-20)', () => {
  const app = loadApp();
  app.setData({ tarefas: [
    { id: 't1', titulo: 'Atrasada', prazo: '2026-10-19', feito: false },
    { id: 't2', titulo: 'Hoje', prazo: '2026-10-20', feito: false },
    { id: 't3', titulo: 'Amanhã', prazo: '2026-10-21', feito: false },
    { id: 't4', titulo: 'Feita', prazo: '2026-10-01', feito: true },
    { id: 't5', titulo: 'Sem prazo', prazo: '', feito: false },
  ] });
  test('today() follows the local date', () => assert.equal(app.today(), '2026-10-20'));
  test('tarefasUrgentes(): pending tasks due today or earlier, oldest first', () => {
    assert.deepEqual(app.tarefasUrgentes().map(t => t.id), ['t1', 't2']);
  });
  test('prazoLabel(): relative names near today, short date otherwise', () => {
    assert.equal(app.prazoLabel('2026-10-20'), 'Hoje');
    assert.equal(app.prazoLabel('2026-10-21'), 'Amanhã');
    assert.equal(app.prazoLabel('2026-10-19'), 'Ontem');
    assert.equal(app.prazoLabel('2026-10-05'), '05/10');
    assert.equal(app.prazoLabel('2025-10-05'), '05/10/25');
    assert.equal(app.addDays('2026-12-31', 1), '2027-01-01');
  });
});

describe('backup and restore', () => {
  const app = loadApp();
  app.setData(fixture());
  test('recordsFrom() keeps valid records and skips bad ids', () => {
    const recs = app.recordsFrom({ config: { nomeLoja: 'X' }, insumos: { ok_1: { nome: 'A' }, 'bad id!': { nome: 'B' } }, pedidos: [] });
    // Array.from: the array was created inside the VM context (another realm).
    assert.deepEqual(Array.from(recs, r => `${r.colecao}/${r.id}`), ['config/geral', 'insumos/ok_1']);
  });
  test('a backup restores every record', () => {
    const backup = JSON.parse(JSON.stringify(app.backupObj()));
    const total = ['insumos', 'produtos', 'gastos', 'pedidos', 'producoes', 'tarefas'].reduce((a, k) => a + app.S[k].length, 0);
    assert.equal(app.recordsFrom(backup).length, total + 1); // + config
    assert.equal(backup.insumos.base.estoqueInicial, '10');
    assert.equal('id' in backup.insumos.base, false);
  });
});

describe('sample data (exemplo.json) regression', () => {
  const app = loadApp();
  const sample = require('../../public/exemplo.json');
  app.setData({});
  for (const r of app.recordsFrom(sample)) app.putLocal(r.colecao, r.id, r.dados);
  test('October 2026 profit matches the value checked when the feature shipped', () => {
    const p = app.monthProfit('2026-10');
    close(Math.round(p.sales * 100) / 100, 594.5);
    close(Math.round(p.goodsCost * 100) / 100, 139.44);
    close(Math.round(p.profit * 100) / 100, 413.56);
  });
  test('August and September 2026 profit', () => {
    close(Math.round(app.monthProfit('2026-08').profit * 100) / 100, 191.99);
    close(Math.round(app.monthProfit('2026-09').profit * 100) / 100, 149.41);
  });
});
