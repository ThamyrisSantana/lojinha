/* Forms. Each one opens in the side drawer; submitDrawer() reads it back and saves the record. */

/* ---------- drawer (modal dialog) ---------- */
let drawer = null;
let drawerOpener = null;

function openDrawer(title, kind, id, body, foot = '') {
  if (!drawer) drawerOpener = document.activeElement;
  $('#drawerRoot').innerHTML = `<div class="overlay" data-act="close"></div>
  <form class="drawer" id="dForm" data-kind="${kind}" data-id="${id || ''}" role="dialog" aria-modal="true" aria-labelledby="dTitle">
    <div class="dhead"><h2 id="dTitle">${esc(title)}</h2><button type="button" class="icon-btn" data-act="close" aria-label="Fechar">${ic('close')}</button></div>
    <div class="dbody">${body}</div>
    <div class="dfoot">${foot}<div class="right">${btn('Cancelar', { act: 'close' }, 'ghost')}<button class="btn primary" type="submit">Salvar</button></div></div>
  </form>`;
  drawer = $('#dForm');
  // Everything behind the dialog stops reacting to clicks, Tab and screen readers.
  $('#app').inert = true;
  drawer.querySelector('input:not([type=hidden]):not([type=file]), select, textarea')?.focus({ preventScroll: true });
}

function closeDrawer() {
  if (!drawer) return;
  $('#drawerRoot').innerHTML = '';
  drawer = null;
  $('#app').inert = false;
  // Give focus back to what opened the dialog; if a re-render replaced it, to the page title.
  const target = drawerOpener?.isConnected ? drawerOpener : $('#view h1');
  drawerOpener = null;
  if (target) {
    if (!target.hasAttribute('tabindex') && target.tagName === 'H1') target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}

const formFoot = (col, id) => (id ? delBtn(col, id, 'ghost') : '');
/** Reads the repeated rows (recipe lines, order items) of the open form. */
const readRows = type =>
  $$(`[data-row="${type}"]`, drawer).map(r => Object.fromEntries($$('[data-f]', r).map(e => [e.dataset.f, e.value])));
const formData = () => Object.fromEntries(new FormData(drawer));
const isOpen = kind => drawer && drawer.dataset.kind === kind;

const pickOptions = (list, label, selected, placeholder = 'Escolha…') =>
  `<option value="">${placeholder}</option>` +
  sortedByName(list)
    .map(x => `<option value="${x.id}"${selected === x.id ? ' selected' : ''}>${esc(label(x))}</option>`)
    .join('');
const insOptions = (sel, placeholder) =>
  pickOptions(S.insumos, i => `${i.nome} (${i.unidade || 'un'})`, sel, placeholder);
const prodOptions = sel => pickOptions(S.produtos, p => p.nome, sel);

/** One repeated row: a select plus two number inputs and a remove button. */
const lineRow = (type, select, inputs) => {
  const k = newId();
  return `<div class="lrow" data-row="${type}">
  <label class="field"><span>${select.label}</span><select data-f="${select.f}" id="${type}-s-${k}">${select.opts}</select></label>
  ${inputs.map(([f, label, value], n) => `<label class="field"><span>${label}</span><input data-f="${f}" id="${type}-${n}-${k}" inputmode="decimal" value="${esc(value)}"></label>`).join('')}
  <button type="button" class="icon-btn" data-act="rmrow" aria-label="Remover linha">${ic('close')}</button><div class="sub" aria-live="polite"></div></div>`;
};
const rowIns = (it = {}) =>
  lineRow('ins', { f: 'insumoId', label: 'Insumo', opts: insOptions(it.insumoId) }, [
    ['qtd', 'Quantidade', it.qtd ?? 1],
    ['rende', 'Rende (peças)', it.rende ?? 1],
  ]);
const rowPed = (it = {}) =>
  lineRow('ped', { f: 'produtoId', label: 'Produto', opts: prodOptions(it.produtoId) }, [
    ['qtd', 'Qtd', it.qtd ?? 1],
    ['preco', 'Preço un. (R$)', it.preco ?? ''],
  ]);
const grid = (body, cls = 'fg') => `<div class="${cls}">${body}</div>`;

/* ---------- Insumo (supply) ---------- */
function formInsumo(id, pre = {}) {
  const i = id ? insById(id) : { unidade: 'un', ...pre };
  openDrawer(
    id ? 'Editar insumo' : 'Novo insumo',
    'insumo',
    id,
    fieldset(
      '',
      grid(`
      ${F('nome', 'Nome', i.nome, { cls: 'full', req: true, ph: 'Ex.: Papel couché 250g A4' })}
      ${F('categoria', 'Categoria', i.categoria, { list: 'dlCatIns' })}
      ${F('unidade', 'Unidade de medida', i.unidade, { type: 'select', opts: UNIDADES })}
      ${F('custoManual', 'Custo por unidade (R$)', i.custoManual, { dec: true, help: 'Usado até você lançar a primeira compra deste insumo em Gastos.' })}
      ${F('estoqueInicial', 'Estoque inicial / ajuste', i.estoqueInicial, { dec: true, help: 'O que você já tinha antes de usar o painel.' })}
      ${F('estoqueMin', 'Avisar quando ficar abaixo de', i.estoqueMin, { dec: true })}
      ${F('fornecedor', 'Fornecedor', i.fornecedor)}
      ${F('obs', 'Observações', i.obs, { type: 'textarea', cls: 'full' })}`),
    ) + datalist('dlCatIns', CAT_INS),
    formFoot('insumos', id),
  );
}

/* ---------- Produto (product) ---------- */
function formProduto(id) {
  const p = id ? prodById(id) : { insumos: [], qualidade: 'Alta', tempoMin: 5 };
  const c = cfg();
  const image = `<div class="field full"><span id="imgLbl">Imagem da arte</span><div class="imgpick"><div id="imgPrev">${avatar(p)}</div>
    <input type="file" id="f-img" accept="image/png,image/jpeg,image/webp,image/gif" aria-labelledby="imgLbl" aria-describedby="imgMsg">
    <input type="hidden" name="imagem" id="f-imagem" value="${esc(p.imagem || '')}"></div>
    <small id="imgMsg" aria-live="polite">PNG, JPG ou WEBP, até 10 MB.</small></div>`;
  openDrawer(
    id ? 'Editar produto' : 'Novo produto',
    'produto',
    id,
    `
    ${fieldset(
      'Produto',
      grid(`
      ${F('nome', 'Nome', p.nome, { cls: 'full', req: true, ph: 'Ex.: Botton Gatinho Lunar 38mm' })}
      ${F('categoria', 'Categoria', p.categoria, { list: 'dlCatProd' })}
      ${F('sku', 'Código / SKU', p.sku, { ph: 'opcional' })}
      ${image}`),
    )}
    ${fieldset(
      'Insumos usados por peça',
      `${tsub('Use "rende" quando um insumo vira várias peças. Ex.: 1 folha A4 rende 12 bottons de 38mm.')}
      <div class="rows" id="rowsIns">${(p.insumos || []).map(rowIns).join('')}</div>
      <div>${S.insumos.length ? btn('+ Adicionar insumo', { act: 'addIns' }, 'sm') : '<span class="note warn">Cadastre insumos primeiro na aba Insumos.</span>'}</div>`,
    )}
    ${fieldset(
      'Tempo e preço',
      grid(`
      ${F('tempoMin', 'Tempo de produção por peça (min)', p.tempoMin, { dec: true })}
      ${F('custoExtra', 'Outros custos por peça (R$)', p.custoExtra, { dec: true, help: 'Embalagem, brinde, tag… se não estiverem nos insumos.' })}
      ${F('margem', 'Margem de lucro (%)', p.margem, { dec: true, ph: 'padrão ' + c.margem + '%' })}
      ${F('taxa', 'Taxa de venda (%)', p.taxa, { dec: true, ph: 'padrão ' + c.taxa + '%' })}
      ${F('preco', 'Preço de venda (R$)', p.preco, { dec: true, ph: 'vazio = usar sugerido', cls: 'full', help: 'Deixe vazio para usar o preço sugerido arredondado.' })}`) +
        '<div class="preview" id="calcPrev" aria-live="polite"></div>',
    )}
    ${fieldset(
      'Impressão',
      grid(
        `
      ${F('qtdImprimir', 'Quantidade para imprimir', p.qtdImprimir, { dec: true })}
      ${F('tamanho', 'Tamanho', p.tamanho, { ph: 'Ex.: A5, 38mm, 10×15' })}
      ${F('pecasFolha', 'Peças por folha', p.pecasFolha, { dec: true })}
      ${F('papel', 'Tipo de papel', p.papel, { list: 'dlPapel', cls: 'full' })}
      ${F('qualidade', 'Qualidade', p.qualidade, { type: 'select', opts: QUALIDADES })}
      ${F('densidade', 'Densidade', p.densidade, { ph: 'Ex.: +1, 3, média' })}
      ${F('impressora', 'Impressora', p.impressora, { ph: 'Ex.: Epson L3250' })}
      ${F('brilho', 'Brilho', p.brilho, { dec: true, ph: '0' })}
      ${F('contraste', 'Contraste', p.contraste, { dec: true, ph: '0' })}
      ${F('saturacao', 'Saturação', p.saturacao, { dec: true, ph: '0' })}
      ${F('obsImpressao', 'Observações de impressão', p.obsImpressao, { type: 'textarea', cls: 'full' })}`,
        'fg3',
      ),
    )}
    ${fieldset(
      'Estoque',
      grid(
        F('estoqueInicial', 'Peças prontas que você já tinha', p.estoqueInicial, {
          dec: true,
          help: 'Depois disso, o estoque sobe com a Produção e desce com os Pedidos.',
        }),
      ),
    )}
    ${datalist('dlCatProd', CAT_PROD)}${datalist('dlPapel', PAPEIS)}`,
    formFoot('produtos', id),
  );
  updCalc();
}

/** Live cost preview of the product form. */
function updCalc() {
  if (!isOpen('produto')) return;
  const fd = { ...formData(), insumos: readRows('ins') };
  $$('[data-row="ins"]', drawer).forEach(r => {
    const i = insById($('[data-f=insumoId]', r).value);
    const q = perPiece({ qtd: $('[data-f=qtd]', r).value, rende: $('[data-f=rende]', r).value });
    const u = i ? custoUnit(i).valor : 0;
    $('.sub', r).textContent = i ? `${fmt(q, 4)} ${i.unidade || 'un'} × ${brl(u)} = ${brl(q * u)} por peça` : '';
  });
  const k = custo(null, fd);
  $('#calcPrev').innerHTML =
    `<div><span>Custo total</span><b>${brl(k.total)}</b></div><div><span>Sugerido</span><b>${brl(k.redondo)}</b></div><div class="big"><span>Lucro / peça</span><b>${brl(k.lucro)}</b></div>
   <div class="line">materiais ${brl(k.mat)} + perda ${brl(k.perda)} + mão de obra ${brl(k.mo)} + extras ${brl(k.extra)} · vendendo a ${brl(k.preco)} a margem real fica em ${pct(k.margemReal)}</div>`;
}

/* ---------- Gasto (expense) ---------- */
function formGasto(id, pre = {}) {
  const g = id ? findIn('gastos', id) : { data: today(), categoria: 'Insumo', ...pre };
  openDrawer(
    id ? 'Editar gasto' : 'Novo gasto',
    'gasto',
    id,
    fieldset(
      '',
      grid(`
      ${F('data', 'Data', g.data, { type: 'date', req: true })}
      ${F('categoria', 'Categoria', g.categoria, { type: 'select', opts: CAT_GASTO })}
      ${F('descricao', 'Descrição', g.descricao, { cls: 'full', req: true, ph: 'Ex.: 2 pacotes de papel couché' })}
      ${F('loja', 'Onde comprou', g.loja, { ph: 'Ex.: Kalunga, Shopee' })}
      ${F('nf', 'Nota fiscal / recibo', g.nf, { ph: 'opcional' })}
      ${F('valor', 'Valor pago (R$)', g.valor, { dec: true, req: true })}
      ${F('frete', 'Frete (R$)', g.frete, { dec: true })}`),
    ) +
      fieldset(
        'Entrou no estoque?',
        grid(`
      <label class="field"><span>Insumo comprado</span><select name="insumoId" id="f-insumoId">${insOptions(g.insumoId, 'Não é um insumo')}</select></label>
      ${F('qtd', 'Quantidade comprada', g.qtd, { dec: true, help: 'Na unidade do insumo. Ex.: 2 pacotes de 50 folhas = 100.' })}`),
      ),
    formFoot('gastos', id),
  );
}

/* ---------- Pedido (order) ---------- */
function formPedido(id) {
  const o = id ? findIn('pedidos', id) : { data: today(), status: 'novo', itens: [{}] };
  openDrawer(
    id ? 'Pedido #' + (o.numero || '') : 'Novo pedido',
    'pedido',
    id,
    `
    ${fieldset(
      '',
      grid(`
      ${F('data', 'Data', o.data, { type: 'date', req: true })}
      ${F('numero', 'Número do pedido', o.numero, { ph: 'Ex.: 1042' })}
      ${F('canal', 'Canal de venda', o.canal, { list: 'dlCanal', ph: 'Instagram, Shopee…' })}
      ${F('cliente', 'Cliente', o.cliente)}
      ${F('status', 'Status', o.status, { type: 'select', opts: STATUS_OPTIONS })}
      ${F('nf', 'Nota fiscal (número)', o.nf, { ph: 'deixe vazio se ainda não emitiu' })}`),
    )}
    ${fieldset(
      'Itens',
      `<div class="rows" id="rowsPed">${(o.itens || []).map(rowPed).join('')}</div>
      <div>${S.produtos.length ? btn('+ Adicionar item', { act: 'addPed' }, 'sm') : '<span class="note warn">Cadastre produtos primeiro.</span>'}</div>`,
    )}
    ${fieldset(
      'Valores',
      grid(`
      ${F('freteCobrado', 'Frete cobrado do cliente (R$)', o.freteCobrado, { dec: true })}
      ${F('desconto', 'Desconto (R$)', o.desconto, { dec: true })}
      ${F('taxaValor', 'Taxa da plataforma (R$)', o.taxaValor, { dec: true, help: 'Comissão + tarifa do pagamento.' })}
      ${F('custoEnvio', 'Custo real do envio (R$)', o.custoEnvio, { dec: true })}
      ${F('rastreio', 'Código de rastreio', o.rastreio, { cls: 'full' })}
      ${F('obs', 'Observações', o.obs, { type: 'textarea', cls: 'full' })}`) +
        '<div class="preview" id="pedPrev" aria-live="polite"></div>',
    )}
    ${datalist('dlCanal', CANAIS)}`,
    formFoot('pedidos', id),
  );
  updPed();
}

/** Live totals preview of the order form. */
function updPed() {
  if (!isOpen('pedido')) return;
  const fd = { ...formData(), itens: readRows('ped') };
  const t = totPedido(fd);
  const defaultFee = num(cfg().taxa);
  const feeHint =
    !num(fd.taxaValor) && t.total
      ? ` · taxa estimada pelo padrão (${pct(defaultFee)}): ${brl((t.total * defaultFee) / 100)}`
      : '';
  $('#pedPrev').innerHTML =
    `<div><span>Subtotal</span><b>${brl(t.sub)}</b></div><div><span>Total</span><b>${brl(t.total)}</b></div><div class="big"><span>Líquido</span><b>${brl(t.liquido)}</b></div>
  <div class="line">${t.pecas} ${plural(t.pecas, 'peça')}${feeHint}</div>`;
}

/* ---------- Produção (production batch) ---------- */
function formProducao(prodId) {
  const p = prodId ? prodById(prodId) : null;
  const queued = p ? num(p.qtdImprimir) : 0;
  openDrawer(
    'Registrar lote',
    'producao',
    null,
    fieldset(
      '',
      grid(`
      ${F('data', 'Data', today(), { type: 'date', req: true })}
      <label class="field"><span>Produto</span><select name="produtoId" id="f-produtoId" required>${prodOptions(prodId)}</select></label>
      ${F('qtd', 'Peças produzidas', queued || '', { dec: true, req: true })}
      ${checkbox('zerarFila', 'Tirar da fila de impressão', queued > 0)}
      ${F('obs', 'Observações', '', { type: 'textarea', cls: 'full', ph: 'Ex.: reimpressão, ajustei saturação…' })}`),
    ) + fieldset('Vai descontar do estoque', '<div id="consPrev" class="rows" aria-live="polite"></div>'),
  );
  updProd();
}

/** Live preview of what a batch will take from the supply stock. */
function updProd() {
  if (!isOpen('producao')) return;
  const p = prodById($('#f-produtoId').value);
  const used = consumoDe(p, num($('#f-qtd').value));
  let html;
  if (!p) html = tsub('Escolha um produto.');
  else if (!used.length) html = note('Este produto não tem insumos na receita; nada será descontado.', 'warn');
  else
    html = used
      .map(c => {
        const i = insById(c.insumoId);
        const stock = i ? movIns(i).estoque : 0;
        const short = c.qtd > stock;
        return `<div class="alert">${chip(short ? 'Falta' : 'Ok', short ? 'bad' : 'good', true)}<div><b>${fmt(c.qtd, 3)} ${esc(i?.unidade || '')}</b> de ${esc(i?.nome || '?')} <span class="tsub">· tem ${fmt(stock)}</span></div></div>`;
      })
      .join('');
  $('#consPrev').innerHTML = html;
}

/* ---------- Tarefa (task) ---------- */
function formTarefa(id) {
  const t = id ? findIn('tarefas', id) : { prioridade: 'media', etiqueta: ui.tTag || '' };
  openDrawer(
    id ? 'Editar tarefa' : 'Nova tarefa',
    'tarefa',
    id,
    fieldset(
      '',
      grid(`
      ${F('titulo', 'Tarefa', t.titulo, { cls: 'full', req: true, ph: 'Ex.: comprar argolas para chaveiro' })}
      ${F('prazo', 'Prazo', t.prazo, { type: 'date' })}
      ${F('prioridade', 'Prioridade', t.prioridade, { type: 'select', opts: PRIORITY_OPTIONS })}
      ${F('etiqueta', 'Etiqueta', t.etiqueta, { list: 'dlEtq', ph: 'Ex.: Produção' })}
      ${checkbox('feito', 'Concluída', t.feito)}
      ${F('notas', 'Notas', t.notas, { type: 'textarea', cls: 'full' })}`),
    ) + datalist('dlEtq', ETIQUETAS),
    formFoot('tarefas', id),
  );
}

/* ---------- saving ---------- */
/** Kind of form → collection, form opener and how to turn the form fields into a record. */
const KINDS = {
  insumo: { col: 'insumos', open: formInsumo, build: fd => fd },
  produto: {
    col: 'produtos',
    open: formProduto,
    build: fd => ({ ...fd, insumos: readRows('ins').filter(r => r.insumoId) }),
  },
  gasto: { col: 'gastos', open: formGasto, build: fd => (fd.insumoId ? fd : { ...fd, qtd: '' }) },
  pedido: {
    col: 'pedidos',
    open: formPedido,
    build: fd => ({ ...fd, itens: readRows('ped').filter(r => r.produtoId) }),
  },
  tarefa: {
    col: 'tarefas',
    open: formTarefa,
    build: (fd, prev) => {
      const feito = !!fd.feito;
      // Keep the original completion date; set it when the task is first marked done.
      const feitoEm = !feito ? '' : prev.feito ? prev.feitoEm || '' : nowISO();
      return { ...fd, feito, feitoEm };
    },
  },
  producao: { col: 'producoes', open: () => formProducao() },
};

/** Saves a production batch and, if asked, clears the product from the print queue. */
async function saveBatch(id, fd) {
  const p = prodById(fd.produtoId);
  const q = num(fd.qtd);
  if (!p || q <= 0) {
    toast('Escolha o produto e a quantidade.');
    return false;
  }
  await save('producoes', id, { data: fd.data, produtoId: p.id, qtd: q, obs: fd.obs || '', consumo: consumoDe(p, q) });
  if (fd.zerarFila) await save('produtos', p.id, { ...p, qtdImprimir: 0 });
  toast(`${fmt(q, 0)} peças registradas`);
  return true;
}

async function submitDrawer() {
  const kind = drawer.dataset.kind;
  const def = KINDS[kind];
  const id = drawer.dataset.id || newId();
  const fd = formData();
  const submit = $('button[type=submit]', drawer);
  submit.disabled = true;
  try {
    if (kind === 'producao') {
      if (await saveBatch(id, fd)) closeDrawer();
      return;
    }
    const prev = (drawer.dataset.id && findIn(def.col, id)) || {};
    const rec = def.build(fd, prev);
    if (prev.exemplo) rec.exemplo = true;
    rec.criadoEm = prev.criadoEm || nowISO();
    await save(def.col, id, rec);
    closeDrawer();
    toast('Salvo');
  } catch (e) {
    falhou(e);
  } finally {
    if (submit.isConnected) submit.disabled = false;
  }
}

async function pickImage(file) {
  const msg = $('#imgMsg');
  if (!file) return;
  try {
    msg.textContent = 'Enviando…';
    const r = await uploadImage(file);
    $('#f-imagem').value = r.id;
    $('#imgPrev').innerHTML = `<div class="pimg"><img src="${esc(r.url)}" alt="Prévia da arte"></div>`;
    msg.textContent = 'Imagem salva.';
  } catch (e) {
    msg.textContent = e.message || 'Não foi possível salvar a imagem.';
  }
}
