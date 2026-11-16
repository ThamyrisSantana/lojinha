/* Screens. Each view returns the HTML of one tab; render() in app.js puts it in #view. */

/** Stat card. `tip` (HTML) is an explanation shown on hover/focus and read by screen readers. */
const kpi = ({ label, value, sub = '', cls = '', tip = '', star = false, valueCls = '' }) =>
  `<div class="kpi${cls ? ' ' + cls : ''}"${tip ? ` data-tip="${esc(tip)}" tabindex="0"` : ''}>${star ? STAR : ''}<span>${label}</span><b class="num${valueCls ? ' ' + valueCls : ''}">${value}</b>${sub}${tip ? `<span class="sr-only">${tip.replace(/<[^>]+>/g, ' ')}</span>` : ''}</div>`;

/* ============ Visão geral (overview) ============ */
function vVisao() {
  const k = ui.mes;
  const prevK = shiftMonth(k, -1);
  const prevLabel = mesLabel(prevK);
  const r = resumoMes(k);
  const ant = resumoMes(prevK);
  const pr = monthProfit(k);
  const prPrev = monthProfit(prevK);
  const isEmpty = COLS.every(c => !S[c].length);

  const salesDelta = ant.vendas
    ? {
        txt: `${r.vendas >= ant.vendas ? '▲' : '▼'} ${pct(Math.abs(((r.vendas - ant.vendas) / ant.vendas) * 100))} vs ${prevLabel}`,
        cls: r.vendas >= ant.vendas ? 'up' : 'down',
      }
    : { txt: 'sem vendas no mês anterior', cls: '' };
  // Profit can be negative, so compare it in R$ instead of percent.
  const profitDelta = prPrev.orders
    ? `${pr.profit >= prPrev.profit ? '▲' : '▼'} ${brl(Math.abs(pr.profit - prPrev.profit))} vs ${prevLabel}`
    : 'sem vendas no mês anterior';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const quick = (c, kind, icon, title, sub) =>
    `<button type="button" class="qa ${c}" data-act="new" data-kind="${kind}"><i>${ic(icon)}</i><span>${title}<small>${sub}</small></span></button>`;
  const alerts = overviewAlerts();

  return `${isEmpty ? welcome() : ''}
  ${pageHead(
    'Como a <em>lojinha</em> está indo',
    'Resumo do mês: quanto entrou, quanto saiu e o que precisa da sua atenção.',
    monthNav('mes', k),
    { eyebrow: greeting + '!' },
  )}
  <nav class="quick" aria-label="Atalhos">
    ${quick('c2', 'pedido', 'pedidos', 'Novo pedido', 'registrar uma venda')}
    ${quick('c1', 'gasto', 'gastos', 'Novo gasto', 'compra ou despesa')}
    ${quick('c3', 'producao', 'producao', 'Registrar lote', 'peças impressas')}
    ${quick('c4', 'tarefa', 'tarefas', 'Nova tarefa', 'algo para lembrar')}
  </nav>
  <div class="kpis">
    ${kpi({
      label: 'Lucro do mês',
      value: brl(pr.profit),
      cls: 'feat' + (pr.profit < 0 ? ' neg' : ''),
      star: true,
      tip: '<b>Lucro do mês</b><br>Quanto as vendas renderam depois do custo das peças vendidas (materiais, perda, seu tempo e extras, como em Preços) e das taxas e do envio.',
      sub: `<small>${pr.sales ? `margem ${pct(pr.margin)} · ${profitDelta}` : 'nenhuma venda neste mês'}</small><small class="calc">vendas ${brl(pr.sales)} − peças ${brl(pr.goodsCost)} − taxas e envio ${brl(pr.feesAndShipping)}</small>`,
    })}
    ${kpi({ label: 'Vendas', value: brl(r.vendas), sub: `<small class="${salesDelta.cls}">${salesDelta.txt}</small>` })}
    ${kpi({
      label: 'Caixa do mês',
      value: brl(r.saldo),
      valueCls: r.saldo < 0 ? 'neg' : '',
      tip: '<b>Caixa do mês</b><br>Dinheiro que entrou menos tudo o que saiu no mês (material, equipamentos, fretes…), mesmo que o material comprado ainda não tenha sido usado.',
      sub: `<small>recebido ${brl(r.liquido)} − gastos ${brl(r.gastos)}</small>`,
    })}
    ${kpi({ label: 'Pedidos', value: r.n, sub: `<small>${r.n ? `ticket médio ${brl(r.ticket)}` : 'nenhum neste mês'}</small>` })}
  </div>
  <div class="grid2">
    ${panel(
      'Precisa de atenção',
      `<div class="alerts">${alerts.length ? alerts.join('') : `<div class="alldone">${ic('check')}Tudo em dia: nenhum insumo acabando, nenhum pedido em aberto e fila de impressão vazia.</div>`}</div>`,
      `<span class="count${alerts.length ? ' hot' : ''}">${alerts.length}</span>`,
    )}
    ${panel(
      'Vendas × gastos',
      `<div class="legend"><span><i class="c1"></i>Vendas</span><span><i class="c2"></i>Gastos</span></div>${salesChart(k)}`,
      '<small>últimos 6 meses</small>',
    )}
  </div>
  <div class="grid2b">
    ${productRanking(k, pr)}
    ${channelPanel(k, r)}
  </div>`;
}

function welcome() {
  return `<section class="welcome"><div class="logo"><img src="logo.webp" alt=""></div><div>
    <h2>Boas-vindas ao painel</h2>
    <p>Comece cadastrando seus insumos (papéis, bases de botton, embalagens) e depois os produtos. Se preferir, carregue dados de exemplo para ver tudo funcionando e apague depois em Ajustes.</p>
    <div class="tools">${btn(ic('plus') + 'Primeiro insumo', { act: 'new', kind: 'insumo' }, 'primary')}${btn('Carregar exemplos', { act: 'exemplos' })}</div>
  </div></section>`;
}

/** What needs an action, each item with the button that solves it. */
function overviewAlerts() {
  const alert = (tone, icon, title, sub, button = '') =>
    `<div class="alert"><span class="aic ${tone}">${ic(icon)}</span><div class="atx"><b>${title}</b><span>${sub}</span></div>${button}</div>`;
  const out = [];

  const urgent = tarefasUrgentes();
  if (urgent.length) {
    const late = urgent.filter(t => t.prazo < today()).length;
    out.push(
      alert(
        late ? 'bad' : 'pink',
        'tarefas',
        `${urgent.length} ${plural(urgent.length, 'tarefa')} para fazer${late ? ` · ${late} ${plural(late, 'atrasada')}` : ' hoje'}`,
        urgent
          .slice(0, 3)
          .map(t => esc(t.titulo))
          .join(', ') + (urgent.length > 3 ? '…' : ''),
        btn('Ver', { act: 'tab', v: 'tarefas' }, 'sm'),
      ),
    );
  }

  S.pedidos
    .filter(isPending)
    .sort(byDateAsc)
    .forEach(o => {
      const [label, tone] = STATUS[o.status];
      out.push(
        alert(
          tone,
          'pedidos',
          `Pedido ${esc(o.numero ? '#' + o.numero : 's/ nº')} · ${label.toLowerCase()}`,
          [esc(o.cliente || ''), esc(o.canal || ''), dataBR(o.data)].filter(Boolean).join(' · '),
          btn('Abrir', { act: 'edit', kind: 'pedido', id: o.id }, 'sm'),
        ),
      );
    });

  S.insumos.forEach(i => {
    const e = movIns(i).estoque;
    const [label, tone] = insStatus(i, e);
    if (tone === 'good') return;
    out.push(
      alert(
        tone,
        'insumos',
        `${esc(i.nome)} · ${label.toLowerCase()}`,
        `${fmt(e)} ${esc(i.unidade || 'un')} em estoque${num(i.estoqueMin) ? `, mínimo ${fmt(i.estoqueMin)}` : ''}`,
        btn('Comprei', { act: 'comprar', id: i.id }, 'sm'),
      ),
    );
  });

  const queue = S.produtos.filter(p => num(p.qtdImprimir) > 0);
  if (queue.length) {
    out.push(
      alert(
        'blue',
        'producao',
        `${sum(queue, p => num(p.qtdImprimir))} peças na fila de impressão`,
        queue.map(p => esc(p.nome)).join(', '),
        btn('Ver fila', { act: 'fila' }, 'sm'),
      ),
    );
  }
  return out;
}

/** Sales vs. expenses bars for the 6 months ending in k, with a text version for screen readers. */
function salesChart(k) {
  const data = [...Array(6)].map((_, i) => {
    const m = shiftMonth(k, i - 5);
    return { k: m, ...resumoMes(m), lucro: monthProfit(m).profit };
  });
  const max = Math.max(1, ...data.map(d => Math.max(d.vendas, d.gastos)));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const W = 600,
    H = 230,
    L = 58,
    B = 200,
    T = 14;
  const cw = (W - L - 8) / 6;
  const bw = Math.min(26, cw / 3.2);
  const y = v => B - (v / top) * (B - T);
  const bar = (x, v, color) => {
    const h = B - y(v);
    if (h <= 0) return '';
    const r = Math.min(3, h);
    const yt = y(v);
    return `<path d="M${x},${B} L${x},${yt + r} Q${x},${yt} ${x + r},${yt} L${x + bw - r},${yt} Q${x + bw},${yt} ${x + bw},${yt + r} L${x + bw},${B} Z" fill="${color}"/>`;
  };
  let ticks = '';
  for (let v = 0; v <= top + 1e-9; v += step) {
    ticks += `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmtK(v)}</text>`;
  }
  const bars = data
    .map((d, i) => {
      const cx = L + cw * i + cw / 2;
      const tip = `<b>${mesLabel(d.k)}</b><br>Vendas: ${brl(d.vendas)}<br>Gastos: ${brl(d.gastos)}<br>Lucro: ${brl(d.lucro)}<br>Caixa: ${brl(d.saldo)}`;
      return (
        bar(cx - bw - 1, d.vendas, 'var(--color-chart-1)') +
        bar(cx + 1, d.gastos, 'var(--color-chart-2)') +
        `<text x="${cx}" y="${B + 18}" text-anchor="middle"${d.k === k ? ' class="is-current"' : ''}>${mesLabel(d.k)}</text>` +
        `<rect class="hit" x="${L + cw * i + 2}" y="${T}" width="${cw - 4}" height="${B - T}" data-tip="${esc(tip)}"/>`
      );
    })
    .join('');
  const text = data.map(d => `${mesLongo(d.k)}: vendas ${brl(d.vendas)}, gastos ${brl(d.gastos)}`).join('; ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vendas e gastos por mês. ${esc(text)}.">${ticks}${bars}</svg>`;
}
function niceStep(max) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
const fmtK = v => (v >= 1000 ? 'R$' + fmt(v / 1000, 1) + 'k' : 'R$' + fmt(v, 0));

/** Products of the month ranked by profit or by pieces sold. */
function productRanking(k, pr) {
  const byProfit = ui.rank !== 'pecas';
  const ranked = Object.entries(pr.byProduct)
    .sort((a, b) => (byProfit ? b[1].profit - a[1].profit : b[1].qty - a[1].qty))
    .slice(0, 6);
  const value = x => (byProfit ? x.profit : x.qty);
  const maxV = Math.max(1e-9, ...ranked.map(([, x]) => Math.max(0, value(x))));
  const rows = ranked.map(([id, x]) => {
    const v = value(x);
    const margin = x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0;
    const sub = byProfit
      ? `${fmt(x.qty, 0)} ${plural(x.qty, 'peça')} · margem ${pct(margin)}`
      : `${brl(x.revenue)} em vendas`;
    return hbar(
      `<span class="nm"><span class="t">${esc(prodById(id)?.nome || 'Produto removido')}</span><small>${sub}</small></span>`,
      Math.max(0, v) / maxV,
      `<span class="num${v < 0 ? ' neg' : ''}">${byProfit ? brl(v) : fmt(v, 0)}</span>`,
      'rank',
    );
  });
  const toggle = seg(
    'Ordenar produtos',
    [
      ['lucro', 'Lucro'],
      ['pecas', 'Peças'],
    ],
    ui.rank || 'lucro',
    { act: 'setui', k: 'rank' },
    'sm',
  );
  const rankNote = byProfit
    ? '<p class="tsub rank-note">Lucro de cada produto = vendas − custo das peças − parte das taxas e descontos do pedido.</p>'
    : '';
  return panel(
    `Produtos em ${mesLabel(k)}`,
    rows.length ? rows.join('') + rankNote : tsub('Nenhuma venda registrada neste mês.'),
    toggle,
  );
}

function channelPanel(k, r) {
  const byChannel = {};
  r.ped.forEach(o => {
    const c = o.canal || 'Sem canal';
    byChannel[c] = (byChannel[c] || 0) + totPedido(o).total;
  });
  const list = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);
  const maxV = Math.max(1, ...list.map(x => x[1]));
  const body = list.length
    ? list
        .map(([c, v]) => hbar(`<span>${esc(c)}</span>`, v / maxV, `<span class="num">${brl(v)}</span>`, 'alt'))
        .join('')
    : tsub('Nenhuma venda registrada neste mês.');
  return panel('Vendas por canal', body, `<small>${mesLabel(k)}</small>`);
}

/* ============ Preços (pricing) ============ */
const marginTone = m => (m < 15 ? 'bad' : m < 30 ? 'warn' : 'good');

function vPreco() {
  const ps = sortedByName(S.produtos);
  const c = cfg();
  const rows = ps
    .map(p => {
      const k = productCost(p);
      const open = ui.open[p.id];
      return `<tr><td><div class="media">${avatar(p, 'sm')}<div>${nameCell(esc(p.nome) + exChip(p), esc(p.categoria || '') + (p.sku ? ' · ' + esc(p.sku) : ''))}</div></div></td>
      <td class="r num"><b>${brl(k.total)}</b>${tsub(`materiais ${brl(k.mat + k.perda)} · ${fmt(p.tempoMin, 0)} min`)}</td>
      <td class="r num">${brl(k.redondo)}</td>
      <td class="r num"><b>${brl(k.preco)}</b>${tsub(k.manual ? 'definido por você' : 'sugerido')}</td>
      <td class="r num">${brl(k.lucro)}</td>
      <td class="r">${chip(pct(k.margemReal), marginTone(k.margemReal))}</td>
      <td>${rowActions(btn(open ? 'Fechar' : 'Detalhes', { act: 'toggle', id: p.id }, 'sm ghost'), editBtn('produto', p.id))}</td></tr>
      ${open ? `<tr class="detail"><td colspan="7">${breakdown(p, k)}</td></tr>` : ''}`;
    })
    .join('');
  const defaults = `<div class="chips-row">${[
    `Mão de obra ${brl(num(c.valorHora))}/h`,
    `Margem ${pct(num(c.margem))}`,
    `Taxa de venda ${pct(num(c.taxa))}`,
    `Perda ${pct(num(c.perda))}`,
  ]
    .map(t => chip(t))
    .join('')}</div>`;
  return `
  ${pageHead(
    'Precificação',
    'Quanto custa fazer cada peça (insumos + seu tempo + perdas) e por quanto vender. Clique em Detalhes para ver a conta completa.',
    btn('Mudar padrões', { act: 'tab', v: 'ajustes' }, 'ghost') + newBtn('produto', 'Novo produto'),
    { extra: defaults },
  )}
  ${
    ps.length
      ? table(
          ['Produto', '>Custo por peça', '>Preço sugerido', '>Preço de venda', '>Lucro por peça', '>Margem', ''],
          rows,
        ) +
        note(
          'O lucro já desconta a taxa da plataforma e paga seu tempo pelo valor-hora. Margem abaixo de 15% fica em vermelho, até 30% em amarelo. Custo dos insumos = média do que você pagou nas compras (aba Gastos), ou o valor informado no insumo.',
        )
      : empty(
          'Nenhum produto cadastrado',
          'Cadastre um produto com os insumos e o tempo que leva para fazer; o preço sugerido aparece na hora.',
          newBtn('produto', 'Novo produto'),
        )
  }`;
}

/** Full cost calculation of one product (the "Detalhes" row). */
function breakdown(p, k) {
  const lines = k.linhas.length
    ? k.linhas
        .map(
          l => `<tr><td>${esc(l.ins?.nome || 'Insumo removido')}${num(l.rende) > 1 ? tsub(`${fmt(l.qtd)} ${esc(l.ins?.unidade || '')} rende ${fmt(l.rende, 0)} peças`) : ''}</td>
          <td class="r num">${fmt(l.q, 4)} ${esc(l.ins?.unidade || '')}</td><td class="r num">${brl(l.u)}</td><td class="r num">${brl(l.sub)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="tsub">Nenhum insumo ligado a este produto.</td></tr>';
  const line = (label, value, cls = '') =>
    cls
      ? `<div class="${cls}"><span>${label}</span><span class="num">${value}</span></div>`
      : `<div><span class="k">${label}</span><span class="num">${value}</span></div>`;
  return `<div class="bk"><div><table><thead><tr><th>Insumo</th><th class="r">Usa por peça</th><th class="r">Custo unit.</th><th class="r">Subtotal</th></tr></thead><tbody>${lines}</tbody></table></div>
  <div class="sum">
    ${line('Materiais', brl(k.mat))}
    ${line(`Perda (${pct(num(cfg().perda))})`, brl(k.perda))}
    ${line(`Mão de obra (${fmt(p.tempoMin, 0)} min)`, brl(k.mo))}
    ${line('Extras', brl(k.extra))}
    ${line('Custo total', brl(k.total), 'tot')}
    ${line(`Margem ${pct(k.margem)} + taxa ${pct(k.taxa)}`, brl(k.sugerido))}
    ${line('Arredondado', brl(k.redondo))}
    ${line(`Lucro por peça a ${brl(k.preco)}`, brl(k.lucro), 'tot')}
  </div></div>`;
}

/* ============ Catálogo (catalog & print settings) ============ */
function vCatalogo() {
  const all = sortedByName(S.produtos);
  const queue = all.filter(p => num(p.qtdImprimir) > 0);
  const ps = ui.filaSo ? queue : all;
  const filter = seg(
    'Mostrar',
    [
      ['', `Todos <span>${S.produtos.length}</span>`],
      ['1', `Na fila <span>${queue.length}</span>`],
    ],
    ui.filaSo ? '1' : '',
    { act: 'setui', k: 'filaSo' },
  );
  const body = ps.length
    ? `<div class="cards">${ps.map(productCard).join('')}</div>`
    : ui.filaSo
      ? empty('Fila de impressão vazia', 'Defina "quantidade para imprimir" em um produto para ele aparecer aqui.')
      : empty(
          'Nenhum produto cadastrado',
          'Adicione a arte, o papel e as configurações de cor que funcionam na sua impressora.',
          newBtn('produto', 'Novo produto'),
        );
  return `
  ${pageHead(
    'Catálogo <em>&amp;</em> impressão',
    'Cada produto com a arte, as peças prontas e a ficha de impressão. Registrar uma impressão desconta os insumos do estoque.',
    filter + newBtn('produto', 'Novo produto'),
  )}
  ${body}`;
}

function productCard(p) {
  const e = estoqueProd(p);
  const q = num(p.qtdImprimir);
  const field = (label, v, cls = '') =>
    filled(v) ? `<div class="${cls}"><dt>${label}</dt><dd>${esc(v)}</dd></div>` : '';
  const signed = v => (num(v) > 0 ? '+' : '') + v;
  // Brightness, contrast and saturation become one line; empty fields are hidden.
  const color = () => {
    const set = [
      ['brilho', p.brilho],
      ['contraste', p.contraste],
      ['saturação', p.saturacao],
    ].filter(x => filled(x[1]));
    if (!set.length) return '';
    const changed = set.filter(x => num(x[1]) !== 0);
    return field(
      'Ajuste de cor',
      changed.length ? changed.map(([n, v]) => n + ' ' + signed(v)).join(' · ') : 'sem ajuste',
      'wide',
    );
  };
  const pairs = [
    ['Tamanho', p.tamanho],
    ['Peças por folha', p.pecasFolha],
    ['Qualidade', p.qualidade],
    ['Densidade', p.densidade],
    ['Impressora', p.impressora],
  ].filter(x => filled(x[1]));
  // An odd number of half-width fields: the last one takes the full row.
  const specs =
    field('Papel', p.papel, 'wide') +
    pairs.map(([l, v], i) => field(l, v, pairs.length % 2 && i === pairs.length - 1 ? 'wide' : '')).join('') +
    color() +
    field('Observações', p.obsImpressao, 'wide');
  return `<article class="pcard">
    <div class="ptop">${avatar(p, p.categoria === 'Botton' ? '' : 'sq')}<div><h3>${esc(p.nome)}</h3><div class="chips">${chip(esc(p.categoria || 'Sem categoria'))}${chip(`${fmt(e, 0)} ${plural(e, 'pronta')}`, e <= 0 ? 'bad' : e < 5 ? 'warn' : 'good', true)}${p.exemplo ? chip('exemplo', 'ex') : ''}</div></div></div>
    <p class="fhead">Ficha de impressão</p>
    ${specs ? `<dl class="ficha">${specs}</dl>` : tsub('Ainda sem ficha. Clique em Editar para anotar papel, tamanho e ajustes de cor.')}
    <div class="pfoot"><div class="queue${q ? '' : ' zero'}"><b>${fmt(q, 0)}</b><span>para imprimir</span></div><div>${editBtn('produto', p.id)}${q > 0 ? btn('Registrar impressão', { act: 'produzir', id: p.id }, 'sm primary') : ''}</div></div>
  </article>`;
}

/* ============ Insumos (supplies) ============ */
function vInsumos() {
  const list = sortedByName(S.insumos).map(i => ({ i, m: movIns(i), c: custoUnit(i) }));
  const stockValue = x => Math.max(0, x.m.estoque) * x.c.valor;
  const rows = list
    .map(x => {
      const { i, m, c } = x;
      const [label, tone] = insStatus(i, m.estoque);
      return `<tr>
      <td>${nameCell(esc(i.nome) + exChip(i), esc(i.categoria || '') + (i.fornecedor ? ' · ' + esc(i.fornecedor) : ''))}</td>
      <td class="r num"><b>${fmt(m.estoque)}</b> ${esc(i.unidade || 'un')}</td>
      <td>${chip(label, tone, true)}</td>
      <td class="r num">${num(i.estoqueMin) ? fmt(i.estoqueMin) : '—'}</td>
      <td class="r num">${brl(c.valor)}${tsub(c.fonte === 'compras' ? `média de ${c.n} ${plural(c.n, 'compra')}` : 'valor informado')}</td>
      <td class="r num">${fmt(num(i.estoqueInicial) + m.comprado)}</td>
      <td class="r num">${fmt(m.usado)}</td>
      <td class="r num">${brl(stockValue(x))}</td>
      <td>${rowActions(btn('Comprei', { act: 'comprar', id: i.id }, 'sm ghost'), editBtn('insumo', i.id))}</td></tr>`;
    })
    .join('');
  const foot = `<tr><td colspan="7">Valor total em estoque</td><td class="r num">${brl(sum(list, stockValue))}</td><td></td></tr>`;
  return `
  ${pageHead('Insumos', 'Estoque = estoque inicial + compras lançadas em Gastos − o que foi usado nas impressões registradas.', newBtn('insumo', 'Novo insumo'))}
  ${
    list.length
      ? table(
          ['Insumo', '>Em estoque', 'Situação', '>Mínimo', '>Custo / unid.', '>Entrou', '>Usado', '>Valor parado', ''],
          rows,
          foot,
        )
      : empty(
          'Nenhum insumo cadastrado',
          'Cadastre papéis, bases de botton, argolas, embalagens… e use-os na receita de cada produto.',
          newBtn('insumo', 'Novo insumo'),
        )
  }`;
}

/* ============ Gastos (expenses) ============ */
function vGastos() {
  const k = ui.gMes;
  const gs = S.gastos.filter(g => !k || inMonth(g, k)).sort(byDateDesc);
  const total = sum(gs, gastoTotal);
  const byCategory = {};
  gs.forEach(g => {
    const c = g.categoria || 'Outros';
    byCategory[c] = (byCategory[c] || 0) + gastoTotal(g);
  });
  const rows = gs
    .map(g => {
      const ins = insById(g.insumoId);
      return `<tr><td class="num">${dataBR(g.data)}</td>
      <td>${nameCell(esc(g.descricao) + exChip(g), esc(g.loja || '') + (g.nf ? ' · NF ' + esc(g.nf) : ''))}</td>
      <td>${chip(esc(g.categoria || 'Outros'))}</td>
      <td>${ins ? `${chip(`+${fmt(g.qtd)} ${esc(ins.unidade || 'un')}`, 'blue')} <span class="tsub">${esc(ins.nome)}</span>` : '<span class="tsub">—</span>'}</td>
      <td class="r num">${brl(num(g.valor))}</td>
      <td class="r num">${num(g.frete) ? brl(num(g.frete)) : '—'}</td>
      <td class="r num"><b>${brl(gastoTotal(g))}</b></td>
      <td>${rowActions(editBtn('gasto', g.id))}</td></tr>`;
    })
    .join('');
  const cards = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => kpi({ label: esc(c), value: brl(v), sub: `<small>${pct((v / total) * 100)} do total</small>` }))
    .join('');
  return `
  ${pageHead(
    'Gastos',
    'Tudo o que saiu do caixa da loja. Compras ligadas a um insumo entram no estoque e atualizam o custo médio.',
    monthNav('gmes', k) +
      btn(k ? 'Ver todos' : 'Só este mês', { act: 'gall' }, 'ghost') +
      newBtn('gasto', 'Novo gasto'),
  )}
  <div class="kpis auto">${kpi({ label: `Total ${k ? mesLabel(k) : 'geral'}`, value: brl(total), cls: 'feat', star: true, sub: `<small>${gs.length} ${plural(gs.length, 'lançamento')}</small>` })}${cards}</div>
  ${
    gs.length
      ? table(['Data', 'Descrição', 'Categoria', 'Entrou no estoque', '>Valor', '>Frete', '>Total', ''], rows)
      : empty(
          'Nenhum gasto ' + (k ? 'em ' + mesLabel(k) : 'lançado'),
          'Lance compras de material, equipamentos, fretes e assinaturas para saber quanto a loja gasta por mês.',
          newBtn('gasto', 'Novo gasto'),
        )
  }`;
}

/* ============ Pedidos (orders) ============ */
function vPedidos() {
  let os = [...S.pedidos].sort((a, b) => byDateDesc(a, b) || (b.numero || '').localeCompare(a.numero || ''));
  if (ui.pStatus === 'abertos') os = os.filter(isInProgress);
  else if (ui.pStatus) os = os.filter(o => o.status === ui.pStatus);
  if (ui.pCanal) os = os.filter(o => o.canal === ui.pCanal);
  const channels = [...new Set([...CANAIS, ...S.pedidos.map(o => o.canal).filter(Boolean)])];
  const rows = os
    .map(o => {
      const t = totPedido(o);
      const items = (o.itens || [])
        .map(i => `${fmt(i.qtd, 0)}× ${esc(prodById(i.produtoId)?.nome || 'produto removido')}`)
        .join(', ');
      return `<tr><td class="num">${dataBR(o.data)}</td>
      <td>${nameCell('#' + esc(o.numero || '—') + exChip(o), esc(o.cliente || ''))}</td>
      <td>${esc(o.canal || '—')}</td>
      <td><div class="tsub cell-items">${items || '—'}</div></td>
      <td class="r num"><b>${brl(t.total)}</b>${tsub('líquido ' + brl(t.liquido))}</td>
      <td>${o.nf ? chip('NF ' + esc(o.nf), 'good') : chip('sem NF', 'warn')}</td>
      <td><select data-act="status" data-id="${o.id}" id="st-${o.id}" aria-label="Status do pedido #${esc(o.numero || '')}">${options(STATUS_OPTIONS, o.status)}</select></td>
      <td>${rowActions(editBtn('pedido', o.id))}</td></tr>`;
    })
    .join('');
  const withoutInvoice = S.pedidos.filter(o => isCounted(o) && !o.nf).length;
  const filters =
    `<select id="fStatus" data-bind="pStatus" aria-label="Filtrar status">${options([['abertos', 'Em andamento'], ['', 'Todos'], ...STATUS_OPTIONS], ui.pStatus)}</select>` +
    `<select id="fCanal" data-bind="pCanal" aria-label="Filtrar canal">${options([['', 'Todos os canais'], ...channels], ui.pCanal)}</select>` +
    newBtn('pedido', 'Novo pedido');
  return `
  ${pageHead('Pedidos', 'Cada venda, por onde veio, quanto rendeu de verdade e a nota fiscal. Pedidos baixam o estoque de peças prontas.', filters)}
  ${withoutInvoice ? note(`${withoutInvoice} ${plural(withoutInvoice, 'pedido')} sem nota fiscal registrada.`, 'warn') : ''}
  ${
    os.length
      ? table(['Data', 'Pedido', 'Canal', 'Itens', '>Total', 'Nota fiscal', 'Status', ''], rows)
      : empty(
          S.pedidos.length ? 'Nenhum pedido com esse filtro' : 'Nenhum pedido ainda',
          'Registre as vendas de cada canal para acompanhar faturamento e estoque.',
          newBtn('pedido', 'Novo pedido'),
        )
  }`;
}

/* ============ Produção (production batches) ============ */
function vProducao() {
  const batches = [...S.producoes].sort(byDateDesc);
  const rows = batches
    .map(x => {
      const p = prodById(x.produtoId);
      const used = (x.consumo || [])
        .map(c => {
          const i = insById(c.insumoId);
          return `${fmt(c.qtd, 3)} ${esc(i?.unidade || '')} ${esc(i?.nome || '?')}`;
        })
        .join(' · ');
      return `<tr><td class="num">${dataBR(x.data)}</td>
      <td>${nameCell(esc(p?.nome || 'Produto removido') + exChip(x), x.obs ? esc(x.obs) : '')}</td>
      <td class="r num"><b>${fmt(x.qtd, 0)}</b></td>
      <td>${tsub(used || '—')}</td>
      <td>${rowActions(delBtn('producoes', x.id))}</td></tr>`;
    })
    .join('');
  return `
  ${pageHead('Produção', 'Cada lote impresso ou montado. Registrar um lote soma peças prontas e desconta os insumos pela receita do produto.', newBtn('producao', 'Registrar lote'))}
  ${
    batches.length
      ? table(['Data', 'Produto', '>Peças', 'Insumos usados', ''], rows) +
        note('Excluir um lote devolve os insumos ao estoque e tira as peças prontas.')
      : empty(
          'Nenhum lote registrado',
          'Quando imprimir ou montar peças, registre aqui para o estoque de insumos se atualizar sozinho.',
          newBtn('producao', 'Registrar lote'),
        )
  }`;
}

/* ============ Tarefas (tasks) ============ */
function taskItem(t) {
  const h = today();
  const late = !t.feito && t.prazo && t.prazo < h;
  const [prLabel, prTone] = priorityOf(t);
  const meta = [
    t.prazo ? chip(prazoLabel(t.prazo), late ? 'bad' : t.prazo === h ? 'pink' : '') : '',
    t.prioridade && t.prioridade !== 'media' ? chip(prLabel, prTone) : '',
    t.etiqueta ? chip(esc(t.etiqueta), 'blue') : '',
    t.feito && t.feitoEm ? `<span class="tsub">feita em ${dataBR(t.feitoEm.slice(0, 10))}</span>` : '',
  ].join('');
  return `<div class="task${t.feito ? ' done' : ''}">
    <button type="button" class="tcheck" data-act="toggleTask" data-id="${t.id}" aria-pressed="${!!t.feito}" aria-label="${t.feito ? 'Reabrir' : 'Concluir'}: ${esc(t.titulo)}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg></button>
    <div class="tmain"><div class="ttitle">${esc(t.titulo)}${exChip(t)}</div><div class="tmeta">${meta}</div>${t.notas ? `<div class="tnotes">${esc(t.notas)}</div>` : ''}</div>
    ${rowActions(editBtn('tarefa', t.id))}</div>`;
}

const taskOrder = (a, b) =>
  (a.prazo || '9999').localeCompare(b.prazo || '9999') ||
  priorityOf(b)[2] - priorityOf(a)[2] ||
  (a.criadoEm || '').localeCompare(b.criadoEm || '');

function vTarefas() {
  const h = today();
  const in7 = addDays(h, 7);
  const ts = ui.tTag ? S.tarefas.filter(t => t.etiqueta === ui.tTag) : S.tarefas;
  const pending = ts.filter(t => !t.feito);
  const done = ts.filter(t => t.feito).sort((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || ''));
  const urgent = tarefasUrgentes().length;
  const group = (title, list, aside = '', cls = '') =>
    list.length
      ? `<section class="tgroup${cls}"><h2>${title} <span class="count">${list.length}</span>${aside}</h2><div class="tlist">${list.map(taskItem).join('')}</div></section>`
      : '';
  const groups = [
    ['Atrasadas', t => t.prazo && t.prazo < h, ' late'],
    ['Hoje', t => t.prazo === h],
    ['Próximos 7 dias', t => t.prazo > h && t.prazo <= in7],
    ['Mais para frente', t => t.prazo > in7],
    ['Sem prazo', t => !t.prazo],
  ];
  const pendingHtml = groups
    .map(([title, fn, cls = '']) => group(title, pending.filter(fn).sort(taskOrder), '', cls))
    .join('');
  const doneHtml = group('Concluídas', done, btn('Apagar concluídas', { act: 'limparFeitas' }, 'sm ghost danger'));
  const bodyHtml = { feitas: doneHtml, todas: pendingHtml + doneHtml }[ui.tFiltro] ?? pendingHtml;
  const emptyHtml = !S.tarefas.length
    ? empty(
        'Nenhuma tarefa ainda',
        'Anote o que precisa fazer: imprimir um lote, responder um cliente, comprar papel, postar no Instagram.',
      )
    : empty(
        ui.tFiltro === 'feitas' ? 'Nenhuma tarefa concluída' : 'Nada pendente por aqui',
        'Use o campo acima para adicionar uma tarefa.',
      );
  const tags = [...new Set([...ETIQUETAS, ...S.tarefas.map(t => t.etiqueta).filter(Boolean)])];
  const summary = `${pending.length} ${plural(pending.length, 'pendente')}${urgent ? ` · ${urgent} para hoje ou ${plural(urgent, 'atrasada')}` : ''}. Marque a caixinha para concluir.`;
  const tools =
    seg(
      'Mostrar',
      [
        ['pendentes', 'Pendentes'],
        ['feitas', 'Concluídas'],
        ['todas', 'Todas'],
      ],
      ui.tFiltro,
      { act: 'setui', k: 'tFiltro' },
    ) +
    `<select id="fTTag" data-bind="tTag" aria-label="Etiqueta">${options([['', 'Todas as etiquetas'], ...tags], ui.tTag)}</select>`;
  return `
  ${pageHead('Lista de <em>tarefas</em>', summary, tools)}
  <form class="quickadd" id="taskQuick" autocomplete="off">
    <input id="tq-titulo" placeholder="Nova tarefa… ex.: imprimir bottons do pedido 1042" aria-label="Nova tarefa" maxlength="200">
    <input type="date" id="tq-prazo" aria-label="Prazo">
    <select id="tq-pri" aria-label="Prioridade">${options(
      [
        ['media', 'Prioridade média'],
        ['alta', 'Prioridade alta'],
        ['baixa', 'Prioridade baixa'],
      ],
      'media',
    )}</select>
    <button class="btn primary" type="submit">Adicionar</button>
  </form>
  ${bodyHtml.trim() ? bodyHtml : emptyHtml}`;
}

/* ============ Ajustes (settings) ============ */
function vAjustes() {
  const c = cfg();
  const samples = COLS.reduce((a, k) => a + S[k].filter(r => r.exemplo).length, 0);
  const setting = (id, name, label, help, cls = '') =>
    `<label class="field ${cls}"><span>${label}</span><input id="${id}" name="${name}"${name === 'nomeLoja' ? '' : ' inputmode="decimal"'} value="${esc(c[name])}"${help ? ` aria-describedby="${id}-help"` : ''}>${help ? `<small id="${id}-help">${help}</small>` : ''}</label>`;
  const theme = temaAtual();
  const themeText =
    theme === 'auto'
      ? `Automático: segue o tema do seu celular ou computador (agora está ${temaEscuro() ? 'escuro' : 'claro'}).`
      : `Tema ${theme === 'dark' ? 'escuro' : 'claro'} fixo neste navegador.`;
  const account = isCloud()
    ? `Conta: <b>${esc(user?.email || '')}</b>. Os dados ficam no Supabase e aparecem em qualquer aparelho em que você entrar.`
    : 'Modo demonstração: os dados ficam só neste navegador. Preencha <span class="mono">config.js</span> com as chaves do Supabase para salvar na nuvem.';
  return `
  ${pageHead('Ajustes', 'Os valores padrão usados na precificação. Cada produto pode sobrescrever margem e taxa.')}
  <form class="panel stack stack-lg narrow" id="cfgForm">
    <div class="fg">
      ${setting('c-nome', 'nomeLoja', 'Nome da loja', '', 'full')}
      ${setting('c-vh', 'valorHora', 'Seu valor-hora (R$)', 'Quanto você quer ganhar por hora de trabalho.')}
      ${setting('c-mg', 'margem', 'Margem de lucro padrão (%)', 'Somada sobre o custo total.')}
      ${setting('c-tx', 'taxa', 'Taxa de venda padrão (%)', 'Comissão da plataforma + meio de pagamento.')}
      ${setting('c-pd', 'perda', 'Perda / desperdício (%)', 'Impressões erradas, cortes, testes.')}
    </div>
    <div><button class="btn primary" type="submit">Salvar ajustes</button></div>
  </form>
  <section class="panel stack narrow"><h2>Aparência</h2>
    ${seg('Tema', themeOptions(false), theme, { act: 'tema' }, 'theme-seg big')}
    ${tsub(themeText + ' A escolha vale só para este aparelho.')}
  </section>
  <section class="panel stack narrow"><h2>Dados</h2>
    ${tsub(`${account}
    ${S.produtos.length} produtos · ${S.insumos.length} insumos · ${S.gastos.length} gastos · ${S.pedidos.length} pedidos · ${S.producoes.length} lotes.`)}
    <div class="row">${btn('Baixar backup (JSON)', { act: 'backup' })}${btn('Restaurar backup…', { act: 'restore' })}<input type="file" id="f-restore" accept="application/json,.json" hidden>
    ${samples ? btn(`Apagar ${samples} registros de exemplo`, { act: 'limparEx' }, 'danger') : btn('Carregar dados de exemplo', { act: 'exemplos' })}</div>
    ${tsub('Restaurar um backup adiciona os registros dele e substitui os que tiverem o mesmo código; nada é apagado.')}
  </section>`;
}
