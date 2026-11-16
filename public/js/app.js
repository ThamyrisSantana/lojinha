/* App shell: UI state, navigation, rendering, theme, events, login and start-up. Loads last. */

/* ============ UI state ============ */
const TABS = [
  ['visao', 'Visão geral'],
  ['tarefas', 'Tarefas'],
  ['pedidos', 'Pedidos'],
  ['catalogo', 'Catálogo'],
  ['preco', 'Preços'],
  ['producao', 'Produção'],
  ['insumos', 'Insumos'],
  ['gastos', 'Gastos'],
  ['ajustes', 'Ajustes'],
];
const VIEWS = {
  visao: vVisao,
  tarefas: vTarefas,
  pedidos: vPedidos,
  catalogo: vCatalogo,
  preco: vPreco,
  producao: vProducao,
  insumos: vInsumos,
  gastos: vGastos,
  ajustes: vAjustes,
};
// The sidebar groups the screens by topic; the phone's bottom bar shows only the most used.
const GRUPOS = [
  ['Dia a dia', ['visao', 'tarefas', 'pedidos']],
  ['Produtos', ['catalogo', 'preco', 'producao']],
  ['Estoque e dinheiro', ['insumos', 'gastos']],
  ['', ['ajustes']],
];
const BNAV = ['visao', 'pedidos', 'tarefas', 'catalogo'];
const tabLabel = k => (TABS.find(t => t[0] === k) || TABS[0])[1];

const UI_KEY = 'painel-ui';
const ui = {
  tFiltro: 'pendentes',
  tTag: '',
  tab: 'visao',
  mes: thisMonth(),
  gMes: thisMonth(),
  pStatus: 'abertos',
  pCanal: '',
  filaSo: false,
  rank: 'lucro',
  open: {},
  ...lsGet(UI_KEY, {}),
};
/** The tab named in the address (#pedidos…), if it is a valid one. */
const tabFromHash = () => (TABS.some(t => '#' + t[0] === location.hash) ? location.hash.slice(1) : null);
ui.tab = tabFromHash() || ui.tab;
// Typing or pasting an address with another #tab switches screens without reloading.
window.addEventListener('hashchange', () => {
  const tab = tabFromHash();
  if (tab && tab !== ui.tab) goToTab(tab);
});
const saveUi = () =>
  lsSet(UI_KEY, { tab: ui.tab, filaSo: ui.filaSo, pStatus: ui.pStatus, tFiltro: ui.tFiltro, rank: ui.rank });

/* ============ rendering ============ */
let raf = 0;
/** Redraws on the next frame; many changes in a row cause a single render. */
function schedule() {
  if (!raf)
    raf = requestAnimationFrame(() => {
      raf = 0;
      render();
    });
}

function renderNav() {
  const badges = { pedidos: S.pedidos.filter(isPending).length, tarefas: tarefasUrgentes().length };
  const item = (k, short) =>
    `<button type="button" data-act="tab" data-v="${k}"${ui.tab === k ? ' aria-current="page"' : ''}>${ic(k)}<span class="lbl">${short && k === 'visao' ? 'Início' : tabLabel(k)}</span>${badges[k] ? `<span class="badge" aria-label="${badges[k]} pendentes">${badges[k]}</span>` : ''}</button>`;
  $('#nav').innerHTML = GRUPOS.map(
    ([g, ks]) => `<div class="ngroup">${g ? `<p>${g}</p>` : ''}${ks.map(k => item(k)).join('')}</div>`,
  ).join('');
  const inBar = BNAV.includes(ui.tab);
  $('#bnav').innerHTML =
    BNAV.map(k => item(k, true)).join('') +
    `<button type="button" data-act="menu" aria-label="Abrir menu com todas as seções"${inBar ? '' : ' aria-current="page"'}>${ic('menu')}<span class="lbl">${inBar ? 'Mais' : tabLabel(ui.tab)}</span></button>`;

  const shop = cfg().nomeLoja || DEFAULTS.nomeLoja;
  $('#shopName').textContent = shop;
  $('#mShop').textContent = shop;
  $('#mTitle').textContent = tabLabel(ui.tab);
  document.title = tabLabel(ui.tab) + ' · ' + shop;
  $('#menuBtn').innerHTML = ic('menu');
  $('#themeSeg').innerHTML = segButtons(themeOptions(true), temaAtual(), { act: 'tema' });

  const dark = temaEscuro();
  const themeBtn = $('#mThemeBtn');
  const themeLabel = dark ? 'Usar tema claro' : 'Usar tema escuro';
  themeBtn.innerHTML = ic(dark ? 'sun' : 'moon');
  themeBtn.setAttribute('aria-label', themeLabel);
  themeBtn.title = themeLabel;
  const meta = $('meta[name=theme-color]');
  if (meta)
    meta.content =
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() ||
      (dark ? '#0C0C0D' : '#F2F2F2');

  const state = $('#storeState');
  state.className = 'store-state ' + (isCloud() ? 'ok' : isDemo() ? 'demo' : '');
  state.querySelector('span').textContent = isCloud()
    ? user?.email || 'Conectado'
    : isDemo()
      ? 'Demonstração'
      : 'Conectando…';
  state.title = isCloud() ? 'Dados salvos na nuvem (Supabase)' : '';
  $('#logoutBtn').hidden = !isCloud();
  $('#demoBar').hidden = !isDemo();
}

function render() {
  withRenderCache(() => {
    renderNav();
    const view = $('#view');
    if (!COLS.every(c => loaded[c])) {
      view.innerHTML = empty('Abrindo o painel…', 'Carregando produtos, insumos, gastos e pedidos.');
      view.setAttribute('aria-busy', 'true');
      return;
    }
    view.removeAttribute('aria-busy');
    // Re-rendering replaces the elements, so keep focus on the same control (by id) if it still exists.
    const focusedId = document.activeElement?.id;
    view.innerHTML = (VIEWS[ui.tab] || vVisao)();
    if (focusedId) document.getElementById(focusedId)?.focus();
  });
}

/** Switches screens and moves keyboard/screen-reader focus to the new page title. */
function goToTab(tab) {
  ui.tab = tab;
  saveUi();
  document.body.classList.remove('menu-open');
  try {
    history.replaceState(null, '', '#' + tab);
  } catch (_) {
    /* file:// or sandboxed iframe */
  }
  render();
  window.scrollTo(0, 0);
  const h1 = $('#view h1');
  if (h1) {
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  }
}

/* ============ theme ============ */
// Dark by default; light or automatic (follows the device) can be chosen.
// The choice is saved in this browser; with no saved choice, index.html already applies dark.
const THEME_KEY = 'painel-tema';
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const temaAtual = () => {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'auto';
};
const temaEscuro = () => {
  const t = temaAtual();
  return t === 'auto' ? systemDark.matches : t === 'dark';
};
function setTema(t) {
  const html = document.documentElement;
  if (t === 'light' || t === 'dark') html.dataset.theme = t;
  else delete html.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, t === 'light' || t === 'dark' ? t : 'auto');
  } catch (_) {
    /* private mode: the theme still applies for this visit */
  }
  render();
}
/** Quick toggle in the phone's top bar: switches between light and dark. */
const trocarTema = () => setTema(temaEscuro() ? 'light' : 'dark');
// In automatic mode, follow the device's change without reloading.
systemDark.addEventListener?.('change', () => {
  if (temaAtual() === 'auto') render();
});
const TEMAS = [
  ['light', 'Claro', 'sun'],
  ['dark', 'Escuro', 'moon'],
  ['auto', 'Automático', 'auto'],
];
/** Theme options for a segmented control; `short` labels "Auto" for the narrow sidebar. */
const themeOptions = short =>
  TEMAS.map(([v, label, icon]) => [
    v,
    ic(icon) + (short && v === 'auto' ? 'Auto' : label),
    { title: v === 'auto' ? 'Segue o tema do celular ou computador' : 'Tema ' + label.toLowerCase() },
  ]);

/* ============ feedback ============ */
let toastTimer = 0;
function toast(message, ms = 2400) {
  const t = $('#toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}
/** Explains why a save failed instead of a generic message. */
function erroSalvar(e) {
  const code = e && e.code;
  const msg = String((e && e.message) || '');
  if (code === '23514' || msg.includes('registros_colecao_check'))
    return 'O banco ainda não aceita esse tipo de registro. Rode de novo o supabase/schema.sql no Supabase.';
  if (code === '42501' || code === 'PGRST301' || /jwt/i.test(msg))
    return 'Sua sessão expirou ou não tem permissão. Saia e entre de novo.';
  if (code === 'quota_exceeded') return 'O armazenamento do painel está cheio.';
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  return 'Não foi possível salvar' + (msg ? ': ' + msg : '.');
}
const falhou = e => {
  console.error(e);
  toast(erroSalvar(e), 6000);
};
/** Runs an action and shows `failMessage` (or the save error) if it throws. */
async function attempt(action, failMessage) {
  try {
    await action();
  } catch (e) {
    if (failMessage) {
      console.error(e);
      toast(failMessage);
    } else falhou(e);
  }
}

/* Destructive buttons ask twice: the first click "arms" the button with a confirmation label,
   the second one runs the action. Clicking anything else disarms it. */
let armed = null;
function disarm() {
  if (!armed) return;
  armed.classList.remove('armed');
  armed.textContent = armed.dataset.lbl;
  armed = null;
}
/** Returns true when the click confirms an already armed button. */
function confirmed(button, label) {
  if (armed === button) {
    armed = null;
    return true;
  }
  disarm();
  button.dataset.lbl = button.textContent;
  button.textContent = label;
  button.classList.add('armed');
  armed = button;
  return false;
}

/* Tooltips ([data-tip]): shown on mouse hover and on keyboard focus. */
const tip = $('#tip');
function placeTip(x, y) {
  tip.style.left = Math.max(8, Math.min(x, innerWidth - tip.offsetWidth - 8)) + 'px';
  tip.style.top = y + 'px';
}
function showTip(el, x, y) {
  tip.innerHTML = el.dataset.tip;
  tip.hidden = false;
  placeTip(x, y);
}
document.addEventListener('mouseover', e => {
  const el = e.target.closest?.('[data-tip]');
  if (el) showTip(el, e.clientX + 14, e.clientY + 14);
  else tip.hidden = true;
});
document.addEventListener('mousemove', e => {
  if (!tip.hidden) placeTip(e.clientX + 14, e.clientY + 14);
});
document.addEventListener('focusin', e => {
  const el = e.target.closest?.('[data-tip]');
  if (!el) return (tip.hidden = true);
  const r = el.getBoundingClientRect();
  showTip(el, r.left, r.bottom + 8);
});
document.addEventListener('focusout', () => (tip.hidden = true));

// A product image that fails to load falls back to the product's initial.
document.addEventListener(
  'error',
  e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.parentElement?.classList.contains('pimg')) return;
    const box = img.parentElement;
    img.remove();
    box.textContent = box.dataset.initial || '';
  },
  true,
);

/* ============ events ============ */
const openForm = (kind, id = null) => KINDS[kind].open(id);
const downloadJson = (obj, filename) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** Click actions, by the button's data-act. Each receives the button. */
const ACTIONS = {
  tab: b => goToTab(b.dataset.v),
  fila: () => {
    ui.filaSo = true;
    goToTab('catalogo');
  },
  setui: b => {
    ui[b.dataset.k] = b.dataset.k === 'filaSo' ? !!b.dataset.v : b.dataset.v;
    saveUi();
    render();
  },
  menu: () => document.body.classList.toggle('menu-open'),
  theme: trocarTema,
  tema: b => setTema(b.dataset.v),
  mes: b => {
    ui.mes = +b.dataset.d ? shiftMonth(ui.mes, +b.dataset.d) : thisMonth();
    render();
  },
  gmes: b => {
    ui.gMes = +b.dataset.d ? shiftMonth(ui.gMes || thisMonth(), +b.dataset.d) : thisMonth();
    render();
  },
  gall: () => {
    ui.gMes = ui.gMes ? '' : thisMonth();
    render();
  },
  toggle: b => {
    ui.open[b.dataset.id] = !ui.open[b.dataset.id];
    render();
  },
  new: b => openForm(b.dataset.kind),
  edit: b => openForm(b.dataset.kind, b.dataset.id),
  comprar: b => {
    const i = insById(b.dataset.id);
    formGasto(null, {
      insumoId: i.id,
      descricao: i.nome,
      loja: i.fornecedor || '',
      categoria: i.categoria === 'Embalagem' ? 'Embalagem' : 'Insumo',
    });
  },
  produzir: b => formProducao(b.dataset.id),
  close: closeDrawer,
  addIns: () => {
    $('#rowsIns').insertAdjacentHTML('beforeend', rowIns());
    $('#rowsIns .lrow:last-child select').focus();
    updCalc();
  },
  addPed: () => {
    $('#rowsPed').insertAdjacentHTML('beforeend', rowPed());
    $('#rowsPed .lrow:last-child select').focus();
    updPed();
  },
  rmrow: b => {
    b.closest('.lrow').remove();
    updCalc();
    updPed();
  },
  toggleTask: async b => {
    const t = findIn('tarefas', b.dataset.id);
    if (!t) return;
    await attempt(async () => {
      await save('tarefas', t.id, { ...t, feito: !t.feito, feitoEm: t.feito ? '' : nowISO() });
      toast(t.feito ? 'Tarefa reaberta' : 'Tarefa concluída');
    });
  },
  del: async b => {
    if (!confirmed(b, 'Confirmar exclusão')) return;
    await attempt(async () => {
      await remove(b.dataset.col, b.dataset.id);
      closeDrawer();
      toast('Excluído');
    }, 'Não foi possível excluir.');
  },
  limparFeitas: async b => {
    if (!confirmed(b, 'Confirmar: apagar concluídas')) return;
    let n = 0;
    for (const t of S.tarefas.filter(x => x.feito)) {
      try {
        await remove('tarefas', t.id);
        n++;
      } catch (e) {
        console.error(e);
      }
    }
    toast(`${n} ${plural(n, 'tarefa apagada', 'tarefas apagadas')}`);
  },
  limparEx: async b => {
    if (!confirmed(b, 'Confirmar: apagar exemplos')) return;
    await attempt(
      async () => toast((await removeExemplos()) + ' exemplos apagados'),
      'Não foi possível apagar os exemplos.',
    );
  },
  exemplos: async b => {
    b.disabled = true;
    await attempt(
      async () => toast((await carregarExemplos()) + ' registros de exemplo carregados'),
      'Não foi possível carregar os exemplos.',
    );
    b.disabled = false;
  },
  backup: () => downloadJson(backupObj(), 'lojinha-backup-' + today() + '.json'),
  restore: () => $('#f-restore').click(),
  logout: () => sb.auth.signOut(),
};
const CONFIRMING = new Set(['del', 'limparFeitas', 'limparEx']);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.tagName === 'SELECT') return;
  const act = b.dataset.act;
  if (!CONFIRMING.has(act)) disarm();
  ACTIONS[act]?.(b);
});

async function restoreBackup(file) {
  let recs = [];
  try {
    recs = recordsFrom(JSON.parse(await file.text()));
  } catch (_) {
    /* not JSON: handled below */
  }
  if (!recs.length) return toast('Esse arquivo não parece um backup do painel.');
  await attempt(async () => {
    await saveMany(recs);
    toast(recs.length + ' registros restaurados');
  }, 'Não foi possível restaurar o backup.');
}

/** Recomputes the live previews of the open form. */
const updateForm = () => {
  updCalc();
  updPed();
  updProd();
};

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.act === 'status') {
    const o = findIn('pedidos', t.dataset.id);
    if (o)
      await attempt(async () => {
        await save('pedidos', o.id, { ...o, status: t.value });
        toast('Status: ' + STATUS[t.value][0]);
      });
    return;
  }
  if (t.dataset.bind) {
    ui[t.dataset.bind] = t.type === 'checkbox' ? t.checked : t.value;
    saveUi();
    render();
    return;
  }
  if (t.id === 'f-img') return pickImage(t.files[0]);
  if (t.id === 'f-restore' && t.files[0]) {
    const file = t.files[0];
    t.value = '';
    return restoreBackup(file);
  }
  if (drawer?.contains(t)) {
    // Picking a product in an order fills in its price, if the price is still empty.
    if (isOpen('pedido') && t.dataset.f === 'produtoId') {
      const p = prodById(t.value);
      const price = t.closest('.lrow').querySelector('[data-f=preco]');
      if (p && !price.value) price.value = custo(p).preco.toFixed(2);
    }
    updateForm();
  }
});
document.addEventListener('input', e => {
  if (drawer?.contains(e.target)) updateForm();
});

function addQuickTask() {
  const input = $('#tq-titulo');
  const titulo = input.value.trim();
  if (!titulo) {
    toast('Escreva a tarefa antes de adicionar.');
    input.focus();
    return;
  }
  const task = {
    titulo,
    prazo: $('#tq-prazo').value,
    prioridade: $('#tq-pri').value,
    etiqueta: ui.tTag || '',
    notas: '',
    feito: false,
    criadoEm: nowISO(),
  };
  attempt(async () => {
    await save('tarefas', newId(), task);
    toast('Tarefa adicionada');
    const fresh = $('#tq-titulo');
    if (fresh) {
      fresh.value = '';
      fresh.focus();
    }
  });
}

document.addEventListener('submit', e => {
  const form = e.target;
  if (form.id === 'loginForm') return; // handled by its own listener
  e.preventDefault();
  if (form.id === 'dForm') submitDrawer();
  else if (form.id === 'taskQuick') addQuickTask();
  else if (form.id === 'cfgForm')
    attempt(async () => {
      await saveConfig({ ...S.config, ...Object.fromEntries(new FormData(form)) });
      toast('Ajustes salvos');
    });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (drawer) closeDrawer();
  else document.body.classList.remove('menu-open');
});

/* ============ login ============ */
let loginMode = 'entrar'; // 'entrar' | 'novaSenha'
const ERROS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
};

function showApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
}
function showLogin(m = 'entrar', msg = '') {
  loginMode = m;
  $('#app').hidden = true;
  $('#login').hidden = false;
  closeDrawer();
  const newPassword = m === 'novaSenha';
  $('#loginTitle').textContent = newPassword ? 'Criar nova senha' : 'Entrar no painel';
  $('#loginHint').textContent = newPassword
    ? 'Digite a nova senha para sua conta.'
    : 'Use o e-mail e a senha da sua conta.';
  $('#emailField').hidden = newPassword;
  $('#lEmail').required = !newPassword;
  $('#lForgot').hidden = newPassword;
  $('#lPassLbl').textContent = newPassword ? 'Nova senha' : 'Senha';
  $('#lPass').autocomplete = newPassword ? 'new-password' : 'current-password';
  $('#lBtn').textContent = newPassword ? 'Salvar senha' : 'Entrar';
  loginMsg(msg);
}
function loginMsg(text, ok) {
  const m = $('#lMsg');
  m.textContent = text;
  m.className = 'login-msg' + (ok ? ' ok' : '');
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const button = $('#lBtn');
  button.disabled = true;
  loginMsg('');
  try {
    if (loginMode === 'novaSenha') {
      const { error } = await sb.auth.updateUser({ password: $('#lPass').value });
      if (error) throw error;
      loginMsg('Senha alterada.', true);
      user = (await sb.auth.getUser()).data.user;
    } else {
      const { data, error } = await sb.auth.signInWithPassword({
        email: $('#lEmail').value.trim(),
        password: $('#lPass').value,
      });
      if (error) throw error;
      user = data.user;
      $('#lPass').value = '';
    }
    await loadCloud();
  } catch (err) {
    loginMsg(ERROS[err.message] || err.message || 'Não foi possível entrar.');
  } finally {
    button.disabled = false;
  }
});

$('#lForgot').addEventListener('click', async () => {
  const email = $('#lEmail').value.trim();
  if (!email) {
    loginMsg('Digite seu e-mail acima e clique de novo.');
    $('#lEmail').focus();
    return;
  }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  loginMsg(error ? error.message : 'Se esse e-mail tiver conta, chega um link para criar nova senha.', !error);
});

/* ============ start-up ============ */
async function boot() {
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase) return loadDemo();
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  sb.auth.onAuthStateChange(ev => {
    if (ev === 'PASSWORD_RECOVERY') setTimeout(() => showLogin('novaSenha'), 0);
    else if (ev === 'SIGNED_OUT') {
      user = null;
      clearData();
      setTimeout(() => showLogin(), 0);
    }
  });
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (location.hash.includes('type=recovery')) return; // PASSWORD_RECOVERY handles it
  if (session) {
    user = session.user;
    await loadCloud();
  } else showLogin();
}

boot();
