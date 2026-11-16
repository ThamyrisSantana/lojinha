/* Shared UI components. Each returns an HTML string; values from the data must go through esc().
   Screens and forms are built only from these, so a change here applies everywhere. */

// Stroke icons (24×24) drawn for the dashboard.
const ICONS = {
  visao:
    '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  tarefas: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12 3 3 5-6"/>',
  preco:
    '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  catalogo:
    '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  insumos: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  gastos: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M7 15h3"/>',
  pedidos: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  producao: '<path d="M6 9V3h12v6"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v7H6z"/>',
  ajustes: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  auto: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
const ic = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const STAR =
  '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.5 5.4 1.6 8.5 4 9.6 1.4.6 3.3.8 6.5.9-3.2.1-5.1.3-6.5.9-2.4 1.1-3.5 4.2-4 9.6-.5-5.4-1.6-8.5-4-9.6C6.6 12.3 4.7 12.1 1.5 12c3.2-.1 5.1-.3 6.5-.9 2.4-1.1 3.5-4.2 4-9.6z"/></svg>';

/** Builds an attribute string from an object, skipping null/false values: attrs({id:'x', hidden:true}). */
const attrs = o =>
  Object.entries(o)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');

/* ---------- page layout ---------- */
/** Page header: title (may contain markup), description, the actions on the right, and optional
    content above the title (`eyebrow`) or below the description (`extra`). */
const pageHead = (title, desc, tools = '', { eyebrow = '', extra = '' } = {}) =>
  `<div class="head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}${extra}</div>${tools ? `<div class="tools">${tools}</div>` : ''}</div>`;

/** Panel with a heading; `aside` sits on the right of the heading (a count, a toggle…). */
const panel = (title, body, aside = '', cls = '') =>
  `<section class="panel${cls ? ' ' + cls : ''}"><h2>${title}${aside ? ' ' + aside : ''}</h2>${body}</section>`;

/**
 * Data table. `cols` are header labels; a label starting with ">" is right-aligned (numbers).
 * Rows are pre-rendered <tr> strings.
 */
const table = (cols, rows, foot = '') =>
  `<div class="tbl-wrap"><table><thead><tr>${cols
    .map(c => (c.startsWith('>') ? `<th class="r">${c.slice(1)}</th>` : `<th>${c}</th>`))
    .join('')}</tr></thead><tbody>${rows}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;

/** Empty state with an optional call to action. */
const empty = (title, text, action = '') => `<div class="empty"><b>${title}</b><span>${text}</span>${action}</div>`;

const note = (text, tone = '') => `<div class="note${tone ? ' ' + tone : ''}">${text}</div>`;
const tsub = text => `<div class="tsub">${text}</div>`;

/** Name + secondary line, used in the first column of most tables. */
const nameCell = (name, sub = '') => `<div class="tname">${name}</div>${sub ? tsub(sub) : ''}`;

/* ---------- small pieces ---------- */
/** Status chip; `dot` adds the colored dot used for stock levels. */
const chip = (text, tone = '', dot = false) =>
  `<span class="chip${tone ? ' ' + tone : ''}">${dot ? '<i></i>' : ''}${text}</span>`;
const exChip = r => (r.exemplo ? ' ' + chip('exemplo', 'ex') : '');

/* ---------- buttons ---------- */
const btn = (label, data = {}, cls = '') =>
  `<button type="button" class="btn${cls ? ' ' + cls : ''}"${attrs(dataAttrs(data))}>${label}</button>`;
const dataAttrs = data => Object.fromEntries(Object.entries(data).map(([k, v]) => ['data-' + k, v]));
/** Primary "+ Novo …" button that opens the form for `kind`. */
const newBtn = (kind, label) => btn(ic('plus') + label, { act: 'new', kind }, 'primary');
const editBtn = (kind, id) => btn('Editar', { act: 'edit', kind, id }, 'sm ghost');
const delBtn = (col, id, cls = 'sm ghost') => btn('Excluir', { act: 'del', col, id }, cls + ' danger');
const rowActions = (...buttons) => `<div class="row-actions">${buttons.join('')}</div>`;

/**
 * Segmented control (a group of toggle buttons). `options` are [value, label] pairs;
 * the button whose value equals `current` is pressed.
 */
const seg = (label, options, current, data, cls = '') =>
  `<div class="seg${cls ? ' ' + cls : ''}" role="group" aria-label="${esc(label)}">${segButtons(options, current, data)}</div>`;
/** Just the buttons of a segmented control, for a group that already exists in the page. */
const segButtons = (options, current, data) =>
  options
    .map(
      ([v, l, extra = {}]) =>
        `<button type="button"${attrs({ ...dataAttrs({ ...data, v }), 'aria-pressed': String(current === v), ...extra })}>${l}</button>`,
    )
    .join('');

/** <option> list; `options` are values or [value, label] pairs. */
const options = (list, selected) =>
  list
    .map(x => {
      const [v, l] = Array.isArray(x) ? x : [x, x];
      return `<option value="${esc(v)}"${String(selected ?? '') === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
    })
    .join('');

/** Month picker: arrows to move, the month name returns to the current month. */
const monthNav = (act, k) => {
  const current = thisMonth();
  return `<div class="month" role="group" aria-label="Mês">
    <button type="button" class="icon-btn" data-act="${act}" data-d="-1" aria-label="Mês anterior">${ic('chevL')}</button>
    <button type="button" class="month-l" data-act="${act}" data-d="0" title="Voltar para o mês atual">${mesLongo(k)}${k && k !== current ? '<small>voltar para hoje</small>' : ''}</button>
    <button type="button" class="icon-btn" data-act="${act}" data-d="1" aria-label="Próximo mês">${ic('chevR')}</button></div>`;
};

/** Product artwork, or its initial when there is no image (a broken image falls back too). */
const avatar = (p, cls = '') => {
  const src = imgUrl(p.imagem);
  const initial = esc((p.nome || '?').trim().charAt(0).toUpperCase());
  return `<div class="pimg ${cls}" data-initial="${initial}">${
    src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : initial
  }</div>`;
};

/** Horizontal bar row (rankings and channels). */
const hbar = (label, ratio, value, cls = '') =>
  `<div class="hbar${cls ? ' ' + cls : ''}">${label}<div class="track"><div class="fill" style="width:${Math.max(0, Math.min(1, ratio)) * 100}%"></div></div>${value}</div>`;

/* ---------- form fields ---------- */
/**
 * Labeled form field. o: {type: 'select'|'textarea'|'date'|…, opts, cls, req, ph, list, dec, help}.
 * The control gets id "f-<name>" so the label and any help text are linked to it.
 */
const F = (name, label, val, o = {}) => {
  const id = 'f-' + name;
  const help = o.help ? `<small id="${id}-help">${o.help}</small>` : '';
  const common = { name, id, required: !!o.req, 'aria-describedby': o.help ? id + '-help' : null };
  let control;
  if (o.type === 'select') control = `<select${attrs(common)}>${options(o.opts, val)}</select>`;
  else if (o.type === 'textarea') control = `<textarea${attrs(common)} rows="2">${esc(val)}</textarea>`;
  else
    control = `<input${attrs({
      ...common,
      value: val ?? '',
      type: o.type || null,
      inputmode: o.dec ? 'decimal' : null,
      placeholder: o.ph || null,
      list: o.list || null,
    })}>`;
  return `<label class="field ${o.cls || ''}"><span>${label}</span>${control}${help}</label>`;
};
const checkbox = (name, label, checked) =>
  `<label class="check align-end"><input type="checkbox" name="${name}" id="f-${name}"${checked ? ' checked' : ''}> ${label}</label>`;
const datalist = (id, list) =>
  `<datalist id="${id}">${list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
const fieldset = (legend, body) => `<fieldset>${legend ? `<legend>${legend}</legend>` : ''}${body}</fieldset>`;
