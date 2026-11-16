/* Data store. With Supabase configured ("nuvem" mode) every record is a row of the `registros`
   table; without it ("demo" mode) the data lives in this browser's localStorage.
   The in-memory copy `S` is what the screens read; every write goes through save/remove,
   which update `S` and schedule a re-render. */

const COLS = ['insumos', 'produtos', 'gastos', 'pedidos', 'producoes', 'tarefas'];
const S = { insumos: [], produtos: [], gastos: [], pedidos: [], producoes: [], tarefas: [], config: {} };
const loaded = {};
const CFG = window.PAINEL_CONFIG || {};
const BUCKET = 'imagens';
const TABLE = 'registros';
const DEMO_KEY = 'painel-lojinha-demo';
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
let sb = null;
let user = null;
let mode = 'loading'; // 'nuvem' | 'demo'

const isCloud = () => mode === 'nuvem';
const isDemo = () => mode === 'demo';
const findIn = (col, id) => S[col].find(x => x.id === id);
const insById = id => findIn('insumos', id);
const prodById = id => findIn('produtos', id);

/** A deep copy of a record without its id (the id is a separate column). */
const cleanData = d => {
  const c = JSON.parse(JSON.stringify(d));
  delete c.id;
  return c;
};
const row = (colecao, id, dados, atualizado_em = nowISO()) => ({ user_id: user.id, colecao, id, dados, atualizado_em });

function putLocal(col, id, dados) {
  if (col === 'config') {
    S.config = dados;
    return;
  }
  if (!S[col]) return;
  const arr = S[col];
  const i = arr.findIndex(x => x.id === id);
  const rec = { id, ...dados };
  if (i >= 0) arr[i] = rec;
  else arr.push(rec);
}

/** Called after every local change: keeps the demo copy saved and redraws the screen. */
function afterChange() {
  if (isDemo()) lsSet(DEMO_KEY, S);
  schedule();
}

async function save(col, id, data) {
  const dados = cleanData(data);
  if (isCloud()) {
    const { error } = await sb.from(TABLE).upsert(row(col, id, dados));
    if (error) throw error;
  }
  putLocal(col, id, dados);
  afterChange();
}

async function remove(col, id) {
  if (isCloud()) {
    const { error } = await sb.from(TABLE).delete().match({ user_id: user.id, colecao: col, id });
    if (error) throw error;
  }
  S[col] = S[col].filter(x => x.id !== id);
  afterChange();
}

const saveConfig = c => save('config', 'geral', c);

/** Saves many records at once: [{colecao, id, dados}], in batches of 200 rows. */
async function saveMany(recs) {
  if (isCloud()) {
    const now = nowISO();
    for (let i = 0; i < recs.length; i += 200) {
      const batch = recs.slice(i, i + 200).map(r => row(r.colecao, r.id, r.dados, now));
      const { error } = await sb.from(TABLE).upsert(batch);
      if (error) throw error;
    }
  }
  recs.forEach(r => putLocal(r.colecao, r.id, r.dados));
  afterChange();
}

async function removeExemplos() {
  if (isCloud()) {
    const { error } = await sb.from(TABLE).delete().eq('user_id', user.id).eq('dados->>exemplo', 'true');
    if (error) throw error;
  }
  let removed = 0;
  COLS.forEach(c => {
    const before = S[c].length;
    S[c] = S[c].filter(r => !r.exemplo);
    removed += before - S[c].length;
  });
  afterChange();
  return removed;
}

/* ---------- backup (same format as exemplo.json: {config, insumos: {id: dados}, ...}) ---------- */
function backupObj() {
  const o = { versao: 1, config: S.config };
  COLS.forEach(c => {
    o[c] = {};
    S[c].forEach(r => (o[c][r.id] = cleanData(r)));
  });
  return o;
}

/** Turns a backup object into records, skipping anything that doesn't look like one. */
function recordsFrom(obj) {
  const recs = [];
  const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
  if (obj.config && typeof obj.config === 'object') recs.push({ colecao: 'config', id: 'geral', dados: obj.config });
  COLS.forEach(c => {
    if (!isObject(obj[c])) return;
    Object.entries(obj[c]).forEach(([id, d]) => {
      if (ID_PATTERN.test(id) && d && typeof d === 'object') recs.push({ colecao: c, id, dados: d });
    });
  });
  return recs;
}

async function carregarExemplos() {
  const r = await fetch('exemplo.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('exemplo.json não encontrado');
  const hasConfig = Object.keys(S.config).length > 0;
  const recs = recordsFrom(await r.json()).filter(x => x.colecao !== 'config' || !hasConfig);
  await saveMany(recs);
  return recs.length;
}

/* ---------- images ---------- */
const IMG_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Uploads an artwork image. In demo mode it is shrunk and kept inline as a data URL. */
async function uploadImage(file) {
  if (!IMG_EXT[file.type]) throw new Error('Formato não aceito. Use PNG, JPG, WEBP ou GIF.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Imagem muito grande (máx. 10 MB).');
  if (isCloud()) {
    const path = `${user.id}/${newId()}.${IMG_EXT[file.type]}`;
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    if (error) throw new Error('Não foi possível enviar a imagem: ' + error.message);
    return { id: path, url: imgUrl(path) };
  }
  const dataUrl = await shrink(file, 360);
  return { id: dataUrl, url: dataUrl };
}

/** Resizes an image so its longest side is at most `max` px and returns a JPEG data URL. */
async function shrink(file, max) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

const imgUrl = p => {
  if (!p) return '';
  if (p.startsWith('data:')) return p;
  const base = String(CFG.supabaseUrl).replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;
};

/* ---------- loading ---------- */
const setLoaded = value => COLS.forEach(c => (loaded[c] = value));
const clearData = () => {
  COLS.forEach(c => (S[c] = []));
  S.config = {};
};

async function loadCloud() {
  mode = 'nuvem';
  showApp();
  setLoaded(false);
  schedule();
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(TABLE)
      .select('colecao,id,dados')
      .eq('user_id', user.id)
      .range(from, from + PAGE - 1);
    if (error) {
      toast('Não consegui carregar os dados: ' + error.message);
      break;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  clearData();
  rows.forEach(r => putLocal(r.colecao, r.id, r.dados || {}));
  setLoaded(true);
  schedule();
}

async function loadDemo() {
  mode = 'demo';
  showApp();
  const saved = lsGet(DEMO_KEY, null);
  if (saved) {
    for (const k of [...COLS, 'config']) if (saved[k]) S[k] = saved[k];
  } else {
    try {
      await carregarExemplos();
    } catch (_) {
      /* no sample file: start empty */
    }
  }
  setLoaded(true);
  schedule();
}
