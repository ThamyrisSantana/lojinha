// Loads the real public/app.js into an isolated VM context with a minimal fake browser,
// so its calculation functions can be unit tested without changing the app.
// The clock is fixed (default 2026-10-20 12:00 local) so date-based results are stable.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const APP = fs.readFileSync(path.join(__dirname, '../../public/app.js'), 'utf8');

// Functions and state the tests read. Appended to the script so `const` bindings are reachable.
const EXPORTS = [
  'S', 'cfg', 'num', 'brl', 'fmt', 'pct', 'today', 'mesLabel', 'dataBR', 'shiftMonth', 'addDays',
  'insById', 'prodById', 'custoUnit', 'movIns', 'insStatus', 'custo', 'estoqueProd', 'totPedido',
  'gastoTotal', 'resumoMes', 'monthProfit', 'tarefasUrgentes', 'prazoLabel', 'recordsFrom',
  'backupObj', 'putLocal', 'cleanData', 'esc',
];

// An element that accepts anything the app does to it at load time.
function fakeElement() {
  const target = {
    dataset: {}, style: {}, hidden: false, innerHTML: '', textContent: '', value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    appendChild() {}, remove() {}, focus() {}, insertAdjacentHTML() {},
    querySelector: () => fakeElement(), querySelectorAll: () => [], closest: () => null,
  };
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => fakeElement()) });
}

function loadApp({ now = new Date(2026, 9, 20, 12, 0, 0) } = {}) {
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
    static now() { return now.getTime(); }
  }
  const store = new Map();
  const documentElement = fakeElement();
  const document = new Proxy({
    documentElement, body: fakeElement(),
    querySelector: () => fakeElement(), querySelectorAll: () => [],
    createElement: () => fakeElement(), addEventListener() {},
  }, { get: (t, k) => (k in t ? t[k] : () => fakeElement()) });

  const context = {
    console, Intl, Math, JSON, Promise, Number, String, Object, Array, Map, Set, RegExp, Error,
    parseFloat, parseInt, isFinite, isNaN, Proxy, Symbol, TextEncoder, URL,
    Date: FixedDate,
    setTimeout, clearTimeout,
    requestAnimationFrame: () => 0,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    location: { hash: '', origin: 'http://localhost', pathname: '/' },
    navigator: {},
    history: { replaceState() {} },
    fetch: () => Promise.reject(new Error('no network in unit tests')),
    CSS: { escape: s => s },
    document,
  };
  context.window = context;
  context.window.PAINEL_CONFIG = {}; // demo mode: no Supabase
  vm.createContext(context);
  vm.runInContext(`${APP}\n;globalThis.__api = { ${EXPORTS.join(', ')} };`, context, { filename: 'public/app.js' });
  const api = context.__api;

  // Replace all collections at once (fixtures are plain objects).
  api.setData = data => {
    for (const k of ['insumos', 'produtos', 'gastos', 'pedidos', 'producoes', 'tarefas']) api.S[k] = data[k] || [];
    api.S.config = data.config || {};
  };
  return api;
}

module.exports = { loadApp };
