/* ============ helpers ============ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v==null||v==='')return 0;const n=parseFloat(String(v).replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:0};
const brl=n=>(isFinite(n)?n:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt=(n,d=2)=>Number(isFinite(n)?n:0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const pct=n=>fmt(n,1)+'%';
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mesLabel=k=>{const [y,m]=k.split('-');return MES[+m-1]+'/'+y.slice(2)};
const dataBR=s=>s?s.split('-').reverse().join('/'):'—';
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const shiftMonth=(k,n)=>{let [y,m]=k.split('-').map(Number);m+=n;while(m<1){m+=12;y--}while(m>12){m-=12;y++}return y+'-'+String(m).padStart(2,'0')};
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

const UNIDADES=['un','folha','m','cm','g','ml','rolo','pacote'];
const CAT_INS=['Papel','Botton','Chaveiro','Embalagem','Tinta','Encadernação','Adesivo','Outros'];
const CAT_PROD=['Botton','Print','Marcador','Bloco de notas','Chaveiro','Adesivo','Cartão','Outros'];
const CAT_GASTO=['Insumo','Embalagem','Equipamento','Frete','Taxas e assinaturas','Marketing','Outros'];
const CANAIS=['Instagram','Shopee','Elo7','Site próprio','WhatsApp','Feira / evento','Mercado Livre','Etsy'];
const STATUS={novo:['Novo','pink'],produzindo:['Produzindo','warn'],enviado:['Enviado','blue'],entregue:['Entregue','good'],cancelado:['Cancelado','']};
const QUALIDADES=['Rascunho','Normal','Alta','Foto / máxima'];
const PRIORIDADES={alta:['Alta','bad',3],media:['Média','warn',2],baixa:['Baixa','',1]};
const ETIQUETAS=['Produção','Pedidos','Criação','Divulgação','Compras','Administrativo'];
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const PAPEIS=['Couché fosco 250g','Couché brilho 250g','Fotográfico glossy 180g','Fotográfico matte 230g','Offset 180g','Canson 300g','Kraft 240g','Adesivo vinil','Adesivo papel'];

/* ============ store: Supabase (nuvem) ou demonstração (navegador) ============ */
const COLS=['insumos','produtos','gastos','pedidos','producoes','tarefas'];
const S={insumos:[],produtos:[],gastos:[],pedidos:[],producoes:[],tarefas:[],config:{}};
const loaded={};
const CFG=window.PAINEL_CONFIG||{};
const BUCKET='imagens', TABLE='registros', DEMO_KEY='painel-lojinha-demo';
let sb=null, user=null, mode='loading'; // 'nuvem' | 'demo'

const cleanData=d=>{const c=JSON.parse(JSON.stringify(d));delete c.id;return c};
function putLocal(col,id,dados){
  if(col==='config'){S.config=dados;return}
  if(!S[col])return;
  const arr=S[col],i=arr.findIndex(x=>x.id===id),row={id,...dados};
  if(i>=0)arr[i]=row;else arr.push(row);
}
const persistDemo=()=>{if(mode==='demo')lsSet(DEMO_KEY,S)};
async function save(col,id,data){
  const dados=cleanData(data);
  if(mode==='nuvem'){
    const {error}=await sb.from(TABLE).upsert({user_id:user.id,colecao:col,id,dados,atualizado_em:new Date().toISOString()});
    if(error)throw error;
  }
  putLocal(col,id,dados);persistDemo();schedule();
}
async function remove(col,id){
  if(mode==='nuvem'){
    const {error}=await sb.from(TABLE).delete().match({user_id:user.id,colecao:col,id});
    if(error)throw error;
  }
  S[col]=S[col].filter(x=>x.id!==id);persistDemo();schedule();
}
const saveConfig=c=>save('config','geral',c);
// Grava vários registros de uma vez: [{colecao,id,dados}]
async function saveMany(recs){
  if(mode==='nuvem'){
    const now=new Date().toISOString();
    for(let i=0;i<recs.length;i+=200){
      const {error}=await sb.from(TABLE).upsert(recs.slice(i,i+200).map(r=>({user_id:user.id,colecao:r.colecao,id:r.id,dados:r.dados,atualizado_em:now})));
      if(error)throw error;
    }
  }
  recs.forEach(r=>putLocal(r.colecao,r.id,r.dados));persistDemo();schedule();
}
async function removeExemplos(){
  if(mode==='nuvem'){
    const {error}=await sb.from(TABLE).delete().eq('user_id',user.id).eq('dados->>exemplo','true');
    if(error)throw error;
  }
  let n=0;COLS.forEach(c=>{const a=S[c].length;S[c]=S[c].filter(r=>!r.exemplo);n+=a-S[c].length});
  persistDemo();schedule();return n;
}
// Backup no mesmo formato do exemplo.json: {config, insumos:{id:dados}, ...}
function backupObj(){const o={versao:1,config:S.config};COLS.forEach(c=>{o[c]={};S[c].forEach(r=>o[c][r.id]=cleanData(r))});return o}
function recordsFrom(obj){
  const recs=[];
  if(obj.config&&typeof obj.config==='object')recs.push({colecao:'config',id:'geral',dados:obj.config});
  COLS.forEach(c=>{const v=obj[c];if(v&&typeof v==='object'&&!Array.isArray(v))Object.entries(v).forEach(([id,d])=>{if(/^[A-Za-z0-9_-]{1,64}$/.test(id)&&d&&typeof d==='object')recs.push({colecao:c,id,dados:d})})});
  return recs;
}
async function carregarExemplos(){
  const r=await fetch('exemplo.json',{cache:'no-store'});if(!r.ok)throw new Error('exemplo.json não encontrado');
  const recs=recordsFrom(await r.json()).filter(x=>x.colecao!=='config'||!Object.keys(S.config).length);
  await saveMany(recs);return recs.length;
}

const IMG_EXT={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
async function uploadImage(file){
  if(!IMG_EXT[file.type])throw new Error('Formato não aceito. Use PNG, JPG, WEBP ou GIF.');
  if(file.size>10*1024*1024)throw new Error('Imagem muito grande (máx. 10 MB).');
  if(mode==='nuvem'){
    const path=`${user.id}/${newId()}.${IMG_EXT[file.type]}`;
    const {error}=await sb.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
    if(error)throw new Error('Não foi possível enviar a imagem: '+error.message);
    return{id:path,url:imgUrl(path)};
  }
  const d=await shrink(file,360);return{id:d,url:d};
}
function shrink(file,max){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.85))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
const imgUrl=p=>!p?'':p.startsWith('data:')?p:`${String(CFG.supabaseUrl).replace(/\/$/,'')}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;

async function loadCloud(){
  mode='nuvem';showApp();COLS.forEach(c=>loaded[c]=false);schedule();
  const rows=[];
  for(let from=0;;from+=1000){
    const {data,error}=await sb.from(TABLE).select('colecao,id,dados').eq('user_id',user.id).range(from,from+999);
    if(error){toast('Não consegui carregar os dados: '+error.message);break}
    rows.push(...data);if(data.length<1000)break;
  }
  COLS.forEach(c=>S[c]=[]);S.config={};
  rows.forEach(r=>putLocal(r.colecao,r.id,r.dados||{}));
  COLS.forEach(c=>loaded[c]=true);schedule();
}
function showApp(){$('#login').hidden=true;$('#app').hidden=false}

/* ---------- login ---------- */
let loginMode='entrar'; // 'entrar' | 'novaSenha'
function showLogin(m='entrar',msg=''){
  loginMode=m;$('#app').hidden=true;$('#login').hidden=false;closeDrawer();
  const nova=m==='novaSenha';
  $('#loginTitle').textContent=nova?'Criar nova senha':'Entrar no painel';
  $('#loginHint').textContent=nova?'Digite a nova senha para sua conta.':'Use o e-mail e a senha da sua conta.';
  $('#emailField').hidden=nova;$('#lEmail').required=!nova;$('#lForgot').hidden=nova;
  $('#lPassLbl').textContent=nova?'Nova senha':'Senha';
  $('#lPass').autocomplete=nova?'new-password':'current-password';
  $('#lBtn').textContent=nova?'Salvar senha':'Entrar';
  const m2=$('#lMsg');m2.textContent=msg;m2.className='login-msg'+(msg&&nova?'':'');
}
function loginMsg(t,ok){const m=$('#lMsg');m.textContent=t;m.className='login-msg'+(ok?' ok':'')}
const ERROS={'Invalid login credentials':'E-mail ou senha incorretos.','Email not confirmed':'Confirme seu e-mail antes de entrar.'};
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();e.stopPropagation();
  const b=$('#lBtn');b.disabled=true;loginMsg('');
  try{
    if(loginMode==='novaSenha'){
      const {error}=await sb.auth.updateUser({password:$('#lPass').value});
      if(error)throw error;
      loginMsg('Senha alterada.',true);user=(await sb.auth.getUser()).data.user;await loadCloud();
    }else{
      const {data,error}=await sb.auth.signInWithPassword({email:$('#lEmail').value.trim(),password:$('#lPass').value});
      if(error)throw error;
      user=data.user;$('#lPass').value='';await loadCloud();
    }
  }catch(err){loginMsg(ERROS[err.message]||err.message||'Não foi possível entrar.')}
  finally{b.disabled=false}
});
$('#lForgot').addEventListener('click',async()=>{
  const email=$('#lEmail').value.trim();
  if(!email){loginMsg('Digite seu e-mail acima e clique de novo.');$('#lEmail').focus();return}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  loginMsg(error?error.message:'Se esse e-mail tiver conta, chega um link para criar nova senha.',!error);
});

async function boot(){
  if(!CFG.supabaseUrl||!CFG.supabaseAnonKey||!window.supabase){
    mode='demo';showApp();
    const d=lsGet(DEMO_KEY,null);
    if(d){for(const k of [...COLS,'config'])if(d[k])S[k]=d[k]}
    else{try{await carregarExemplos()}catch(_){}}
    COLS.forEach(c=>loaded[c]=true);schedule();return;
  }
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey);
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==='PASSWORD_RECOVERY')setTimeout(()=>showLogin('novaSenha'),0);
    else if(ev==='SIGNED_OUT'){user=null;COLS.forEach(c=>S[c]=[]);S.config={};setTimeout(()=>showLogin(),0)}
  });
  const {data:{session}}=await sb.auth.getSession();
  if(location.hash.includes('type=recovery'))return; // PASSWORD_RECOVERY cuida disso
  if(session){user=session.user;await loadCloud()}else showLogin();
}

/* ============ cálculos ============ */
const cfg=()=>Object.assign({valorHora:20,margem:100,taxa:12,perda:5,nomeLoja:'Minha lojinha'},S.config);
const insById=id=>S.insumos.find(i=>i.id===id);
const prodById=id=>S.produtos.find(p=>p.id===id);
function custoUnit(ins){
  const cs=S.gastos.filter(g=>g.insumoId===ins.id&&num(g.qtd)>0);
  if(cs.length){const q=cs.reduce((a,g)=>a+num(g.qtd),0),v=cs.reduce((a,g)=>a+num(g.valor)+num(g.frete),0);return{valor:v/q,fonte:'compras',n:cs.length}}
  return{valor:num(ins.custoManual),fonte:'manual',n:0};
}
function movIns(ins){
  let comprado=0,usado=0;
  S.gastos.forEach(g=>{if(g.insumoId===ins.id)comprado+=num(g.qtd)});
  S.producoes.forEach(p=>(p.consumo||[]).forEach(c=>{if(c.insumoId===ins.id)usado+=num(c.qtd)}));
  return{comprado,usado,estoque:num(ins.estoqueInicial)+comprado-usado};
}
function insStatus(ins,e){const min=num(ins.estoqueMin);if(e<=0)return['Acabou','bad'];if(min>0&&e<=min)return['Repor','warn'];return['Ok','good']}
function custo(p,over){
  const c=cfg(); p=over||p; let mat=0;
  const linhas=(p.insumos||[]).map(it=>{const ins=insById(it.insumoId);const q=num(it.qtd)/(num(it.rende)||1);const u=ins?custoUnit(ins).valor:0;mat+=q*u;return{...it,ins,q,u,sub:q*u}});
  const perda=mat*num(c.perda)/100, mo=num(p.tempoMin)/60*num(c.valorHora), extra=num(p.custoExtra);
  const total=mat+perda+mo+extra;
  const margem=(p.margem!==''&&p.margem!=null)?num(p.margem):num(c.margem);
  const taxa=(p.taxa!==''&&p.taxa!=null)?num(p.taxa):num(c.taxa);
  const sugerido=taxa<100?total*(1+margem/100)/(1-taxa/100):0;
  const redondo=sugerido>0?Math.ceil(sugerido+0.1)-0.1:0;
  const preco=num(p.preco)>0?num(p.preco):redondo;
  const lucro=preco*(1-taxa/100)-total;
  return{linhas,mat,perda,mo,extra,total,margem,taxa,sugerido,redondo,preco,lucro,margemReal:preco>0?lucro/preco*100:0,manual:num(p.preco)>0};
}
function estoqueProd(p){
  let e=num(p.estoqueInicial);
  S.producoes.forEach(x=>{if(x.produtoId===p.id)e+=num(x.qtd)});
  S.pedidos.forEach(o=>{if(o.status!=='cancelado')(o.itens||[]).forEach(i=>{if(i.produtoId===p.id)e-=num(i.qtd)})});
  return e;
}
function totPedido(o){
  const sub=(o.itens||[]).reduce((a,i)=>a+num(i.qtd)*num(i.preco),0);
  const total=sub+num(o.freteCobrado)-num(o.desconto);
  return{sub,total,liquido:total-num(o.taxaValor)-num(o.custoEnvio),pecas:(o.itens||[]).reduce((a,i)=>a+num(i.qtd),0)};
}
const gastoTotal=g=>num(g.valor)+num(g.frete);
function resumoMes(k){
  const ped=S.pedidos.filter(o=>(o.data||'').startsWith(k)&&o.status!=='cancelado');
  const gas=S.gastos.filter(g=>(g.data||'').startsWith(k));
  const vendas=ped.reduce((a,o)=>a+totPedido(o).total,0), liquido=ped.reduce((a,o)=>a+totPedido(o).liquido,0);
  const gastos=gas.reduce((a,g)=>a+gastoTotal(g),0);
  return{ped,gas,vendas,liquido,gastos,saldo:liquido-gastos,n:ped.length,ticket:ped.length?vendas/ped.length:0};
}

/* ============ UI state ============ */
const TABS=[
  ['visao','Visão geral','<path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"/>'],
  ['tarefas','Tarefas','<path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/>'],
  ['preco','Preços','<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15.9V19h-2v-1.1c-1.7-.3-3-1.4-3.1-3h1.8c.1.9 1 1.5 2.3 1.5 1.4 0 2-.7 2-1.4 0-.8-.5-1.3-2.3-1.7-2-.5-3.4-1.3-3.4-3 0-1.4 1.1-2.4 2.7-2.7V6.5h2v1.1c1.6.4 2.6 1.6 2.6 3h-1.8c0-.9-.9-1.5-2-1.5-1.2 0-1.9.6-1.9 1.3 0 .7.6 1.1 2.3 1.5 1.9.5 3.4 1.2 3.4 3.2 0 1.4-1 2.5-2.6 2.8z"/>'],
  ['catalogo','Catálogo','<path d="M19 8H5a3 3 0 00-3 3v6h4v4h12v-4h4v-6a3 3 0 00-3-3zm-3 11H8v-5h8zm3-7a1 1 0 110-2 1 1 0 010 2zm-1-9H6v4h12z"/>'],
  ['insumos','Insumos','<path d="M20 6h-3V4a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zM9 4h6v2H9zm11 15H4V8h16z"/>'],
  ['gastos','Gastos','<path d="M21 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-2h-9a2 2 0 01-2-2V9a2 2 0 012-2zm-9 2v6h10V9zm4 4.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>'],
  ['pedidos','Pedidos','<path d="M7 18a2 2 0 100 4 2 2 0 000-4zM1 2v2h2l3.6 7.6L5.2 14A2 2 0 007 17h12v-2H7.4l1.1-2h7.5a2 2 0 001.7-1l3.6-6.5A1 1 0 0020.4 4H5.2l-.9-2zm16 16a2 2 0 100 4 2 2 0 000-4z"/>'],
  ['producao','Produção','<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>'],
  ['ajustes','Ajustes','<path d="M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.5-2.5 1a7.3 7.3 0 00-1.7-1L15 3h-4l-.3 2.9a7.3 7.3 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.5 2.5-1a7.3 7.3 0 001.7 1L11 21h4l.3-2.9a7.3 7.3 0 001.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"/>'],
];
const ui=Object.assign({tFiltro:'pendentes',tTag:'',tab:'visao',mes:today().slice(0,7),gMes:today().slice(0,7),pStatus:'abertos',pCanal:'',filaSo:false,open:{}},lsGet('painel-ui',{}));
if(/^#[a-z]+$/.test(location.hash)&&TABS.some(t=>'#'+t[0]===location.hash))ui.tab=location.hash.slice(1);
const saveUi=()=>lsSet('painel-ui',{tab:ui.tab,filaSo:ui.filaSo,pStatus:ui.pStatus,tFiltro:ui.tFiltro});

let raf=0; function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}

function renderNav(){
  const badge={pedidos:S.pedidos.filter(o=>o.status==='novo'||o.status==='produzindo').length,tarefas:tarefasUrgentes().length};
  $('#nav').innerHTML=TABS.map(([k,l,ic])=>`<button data-act="tab" data-v="${k}" ${ui.tab===k?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ic}</svg><span class="lbl">${l}</span>${badge[k]?`<span class="badge">${badge[k]}</span>`:''}</button>`).join('');
  $('#shopName').textContent=cfg().nomeLoja||'Minha lojinha';
  const st=$('#storeState');
  st.className='store-state '+(mode==='nuvem'?'ok':mode==='demo'?'demo':'');
  st.querySelector('span').textContent=mode==='nuvem'?(user?.email||'Conectado'):mode==='demo'?'Demonstração':'Conectando…';
  st.title=mode==='nuvem'?'Dados salvos na nuvem (Supabase)':'';
  $('#logoutBtn').hidden=mode!=='nuvem';
  $('#demoBar').hidden=mode!=='demo';
}
function render(){
  renderNav();
  const ready=COLS.every(c=>loaded[c]);
  const v=$('#view');
  if(!ready){v.innerHTML=`<div class="empty"><b>Abrindo o painel…</b><span>Carregando produtos, insumos, gastos e pedidos.</span></div>`;return}
  const fn={tarefas:vTarefas,visao:vVisao,preco:vPreco,catalogo:vCatalogo,insumos:vInsumos,gastos:vGastos,pedidos:vPedidos,producao:vProducao,ajustes:vAjustes}[ui.tab]||vVisao;
  const active=document.activeElement&&document.activeElement.id;
  v.innerHTML=fn();
  if(active&&v.querySelector('#'+CSS.escape(active)))v.querySelector('#'+CSS.escape(active)).focus();
}
const exChip=r=>r.exemplo?' <span class="chip ex">exemplo</span>':'';
const empty=(t,s,act,lbl)=>`<div class="empty"><b>${t}</b><span>${s}</span>${act?`<button class="btn primary" data-act="${act}">${lbl}</button>`:''}</div>`;
const imgSrc=p=>imgUrl(p.imagem);
const avatar=(p,cls='',st='')=>{const s=imgSrc(p);return `<div class="pimg ${cls}" ${st?`style="${st}"`:''}>${s?`<img src="${esc(s)}" alt="" onerror="this.remove()">`:esc((p.nome||'?').trim().charAt(0).toUpperCase())}</div>`};
const delBtn=(col,id)=>`<button type="button" class="btn sm ghost danger" data-act="del" data-col="${col}" data-id="${id}">Excluir</button>`;
const editBtn=(kind,id)=>`<button type="button" class="btn sm ghost" data-act="edit" data-kind="${kind}" data-id="${id}">Editar</button>`;

/* ============ views ============ */
function vVisao(){
  const r=resumoMes(ui.mes), ant=resumoMes(shiftMonth(ui.mes,-1));
  const delta=(a,b)=>b?`${a>=b?'▲':'▼'} ${pct(Math.abs((a-b)/b*100))} vs ${mesLabel(shiftMonth(ui.mes,-1))}`:'sem mês anterior';
  // chart
  const months=[...Array(6)].map((_,i)=>shiftMonth(ui.mes,i-5)), data=months.map(k=>({k,...resumoMes(k)}));
  const max=Math.max(1,...data.map(d=>Math.max(d.vendas,d.gastos)));
  const step=niceStep(max), top=Math.ceil(max/step)*step;
  const W=600,H=230,L=58,B=200,T=14,cw=(W-L-8)/6,bw=Math.min(26,cw/3.2);
  const y=v=>B-(v/top)*(B-T);
  const bar=(x,v,col)=>{const h=B-y(v);if(h<=0)return'';const r=Math.min(bw/2,h);return `<path d="M${x},${B} L${x},${y(v)+r} Q${x},${y(v)} ${x+r},${y(v)} L${x+bw-r},${y(v)} Q${x+bw},${y(v)} ${x+bw},${y(v)+r} L${x+bw},${B} Z" fill="${col}"/>`};
  let ticks='';for(let v=0;v<=top+1e-9;v+=step)ticks+=`<line class="grid" x1="${L}" x2="${W-8}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${fmtK(v)}</text>`;
  const bars=data.map((d,i)=>{const cx=L+cw*i+cw/2;return bar(cx-bw-1,d.vendas,'var(--s1)')+bar(cx+1,d.gastos,'var(--s2)')+
    `<text x="${cx}" y="${B+18}" text-anchor="middle" ${d.k===ui.mes?'style="fill:var(--ink);font-weight:800"':''}>${mesLabel(d.k)}</text>`+
    `<rect class="hit" x="${L+cw*i+2}" y="${T}" width="${cw-4}" height="${B-T}" data-tip="<b>${mesLabel(d.k)}</b><br>Vendas: ${brl(d.vendas)}<br>Gastos: ${brl(d.gastos)}<br>Saldo: ${brl(d.saldo)}"/>`}).join('');
  // alertas
  const al=[];
  S.insumos.forEach(i=>{const e=movIns(i).estoque,[l,c]=insStatus(i,e);if(c!=='good')al.push(`<div class="alert"><span class="chip ${c}"><i></i>${l}</span><div><b>${esc(i.nome)}</b> <span class="tsub">· ${fmt(e)} ${esc(i.unidade||'un')} em estoque${num(i.estoqueMin)?`, mínimo ${fmt(i.estoqueMin)}`:''}</span></div></div>`)});
  S.pedidos.filter(o=>o.status==='novo'||o.status==='produzindo').sort((a,b)=>(a.data||'').localeCompare(b.data||'')).forEach(o=>al.push(`<div class="alert"><span class="chip ${STATUS[o.status][1]}"><i></i>${STATUS[o.status][0]}</span><div><b>Pedido ${esc(o.numero||'s/ nº')}</b> <span class="tsub">· ${esc(o.cliente||'')} · ${esc(o.canal||'')} · ${dataBR(o.data)}</span></div><button class="btn sm ghost" data-act="edit" data-kind="pedido" data-id="${o.id}">Abrir</button></div>`));
  const urg=tarefasUrgentes();
  if(urg.length){const atr=urg.filter(t=>t.prazo<today()).length;al.unshift(`<div class="alert"><span class="chip ${atr?'bad':'pink'}"><i></i>${atr?'Atrasada':'Hoje'}</span><div><b>${urg.length} tarefa${urg.length>1?'s':''} para fazer${atr?`, ${atr} atrasada${atr>1?'s':''}`:' hoje'}</b> <span class="tsub">· ${urg.slice(0,3).map(t=>esc(t.titulo)).join(', ')}${urg.length>3?'…':''}</span></div><button class="btn sm ghost" data-act="tab" data-v="tarefas">Ver</button></div>`)}
  const fila=S.produtos.filter(p=>num(p.qtdImprimir)>0);
  if(fila.length)al.push(`<div class="alert"><span class="chip blue"><i></i>Imprimir</span><div><b>${fila.reduce((a,p)=>a+num(p.qtdImprimir),0)} peças na fila</b> <span class="tsub">· ${fila.map(p=>esc(p.nome)).join(', ')}</span></div><button class="btn sm ghost" data-act="tab" data-v="catalogo">Ver fila</button></div>`);
  // mais vendidos & canais
  const vend={},canal={};
  r.ped.forEach(o=>{canal[o.canal||'Sem canal']=(canal[o.canal||'Sem canal']||0)+totPedido(o).total;(o.itens||[]).forEach(i=>{vend[i.produtoId]=(vend[i.produtoId]||0)+num(i.qtd)})});
  const topV=Object.entries(vend).sort((a,b)=>b[1]-a[1]).slice(0,6), mv=Math.max(1,...topV.map(x=>x[1]));
  const topC=Object.entries(canal).sort((a,b)=>b[1]-a[1]), mc=Math.max(1,...topC.map(x=>x[1]));
  const vazio=COLS.every(c=>!S[c].length);
  return `${vazio?`<section class="welcome"><div class="logo"><img src="logo.webp" alt=""></div><div><h2>Boas-vindas ao painel</h2><p>Comece cadastrando seus insumos (papéis, bases de botton, embalagens) e depois os produtos. Se preferir, carregue dados de exemplo para ver tudo funcionando e apague depois em Ajustes.</p><div class="tools"><button class="btn primary" data-act="new" data-kind="insumo">+ Primeiro insumo</button><button class="btn" data-act="exemplos">Carregar exemplos</button></div></div></section>`:''}
  <div class="head"><span class="spark" style="width:18px;height:18px;right:34%;top:-4px;color:var(--lime)" aria-hidden="true"></span><span class="burst" style="width:40px;height:40px;right:24%;top:6px;color:var(--butter);opacity:.9" aria-hidden="true"></span><span class="spark" style="width:12px;height:12px;right:20%;top:52px;color:var(--lilac)" aria-hidden="true"></span>
    <div><h1>Como a <em>lojinha</em> está <em class="lime">indo</em></h1><p>Vendas, gastos e o que precisa da sua atenção no mês.</p></div>
    <div class="tools"><button class="icon-btn" data-act="mes" data-d="-1" aria-label="Mês anterior">‹</button><input type="month" id="fMes" value="${ui.mes}" data-bind="mes" aria-label="Mês"><button class="icon-btn" data-act="mes" data-d="1" aria-label="Próximo mês">›</button></div></div>
  <nav class="quick" aria-label="Atalhos">
    <button class="qa c2" data-act="new" data-kind="pedido"><i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 18a2 2 0 100 4 2 2 0 000-4zM1 2v2h2l3.6 7.6L5.2 14A2 2 0 007 17h12v-2H7.4l1.1-2h7.5a2 2 0 001.7-1l3.6-6.5A1 1 0 0020.4 4H5.2l-.9-2zm16 16a2 2 0 100 4 2 2 0 000-4z"/></svg></i>Novo pedido</button>
    <button class="qa c1" data-act="new" data-kind="gasto"><i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-2h-9a2 2 0 01-2-2V9a2 2 0 012-2zm-9 2v6h10V9zm4 4.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg></i>Novo gasto</button>
    <button class="qa c3" data-act="new" data-kind="producao"><i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 8H5a3 3 0 00-3 3v6h4v4h12v-4h4v-6a3 3 0 00-3-3zm-3 11H8v-5h8zm3-7a1 1 0 110-2 1 1 0 010 2zm-1-9H6v4h12z"/></svg></i>Registrar lote</button>
    <button class="qa c4" data-act="new" data-kind="tarefa"><i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg></i>Nova tarefa</button>
  </nav>
  <div class="kpis">
    <div class="kpi"><span>Vendas</span><b class="num">${brl(r.vendas)}</b><small>${delta(r.vendas,ant.vendas)}</small></div>
    <div class="kpi"><span>Recebido líquido</span><b class="num">${brl(r.liquido)}</b><small>depois de taxas e envio</small></div>
    <div class="kpi"><span>Gastos</span><b class="num">${brl(r.gastos)}</b><small>${r.gas.length} lançamento${r.gas.length===1?'':'s'}</small></div>
    <div class="kpi hl"><span>Saldo do mês</span><b class="num">${brl(r.saldo)}</b><small>líquido − gastos</small></div>
    <div class="kpi"><span>Pedidos</span><b class="num">${r.n}</b><small>ticket médio ${brl(r.ticket)}</small></div>
  </div>
  <div class="grid2">
    <section class="panel"><h2>Vendas × gastos <small>últimos 6 meses</small></h2>
      <div class="legend"><span><i style="background:var(--s1)"></i>Vendas</span><span><i style="background:var(--s2)"></i>Gastos</span></div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vendas e gastos por mês">${ticks}${bars}</svg>
    </section>
    <section class="panel"><h2>Precisa de atenção <small>${al.length||''}</small></h2>
      <div class="alerts">${al.length?al.join(''):'<div class="tsub">Tudo em dia: nenhum insumo acabando, nenhum pedido em aberto e fila de impressão vazia.</div>'}</div></section>
  </div>
  <div class="grid2b">
    <section class="panel"><h2>Mais vendidos <small>peças em ${mesLabel(ui.mes)}</small></h2>
      ${topV.length?topV.map(([id,q])=>`<div class="hbar"><span>${esc(prodById(id)?.nome||'Produto removido')}</span><div class="track"><div class="fill" style="width:${q/mv*100}%"></div></div><span class="num">${fmt(q,0)}</span></div>`).join(''):'<div class="tsub">Nenhuma venda registrada neste mês.</div>'}</section>
    <section class="panel"><h2>Vendas por canal <small>${mesLabel(ui.mes)}</small></h2>
      ${topC.length?topC.map(([c,v])=>`<div class="hbar"><span>${esc(c)}</span><div class="track"><div class="fill" style="width:${v/mc*100}%"></div></div><span class="num">${brl(v)}</span></div>`).join(''):'<div class="tsub">Nenhuma venda registrada neste mês.</div>'}</section>
  </div>`;
}
function niceStep(max){const raw=max/4,p=Math.pow(10,Math.floor(Math.log10(raw))),n=raw/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function fmtK(v){return v>=1000?'R$'+fmt(v/1000,1)+'k':'R$'+fmt(v,0)}

function vPreco(){
  const ps=[...S.produtos].sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  const c=cfg();
  const rows=ps.map(p=>{const k=custo(p),open=ui.open[p.id];
    const st=k.margemReal<15?'bad':k.margemReal<30?'warn':'good';
    return `<tr><td><div style="display:flex;gap:10px;align-items:center">${avatar(p,'','width:38px;height:38px;font-size:15px;box-shadow:0 0 0 1px var(--line)')}<div><div class="tname">${esc(p.nome)}${exChip(p)}</div><div class="tsub">${esc(p.categoria||'')}${p.sku?' · '+esc(p.sku):''}</div></div></div></td>
      <td class="r num">${brl(k.mat+k.perda)}</td><td class="r num">${brl(k.mo)}<div class="tsub">${fmt(p.tempoMin,0)} min</div></td><td class="r num">${brl(k.extra)}</td>
      <td class="r num"><b>${brl(k.total)}</b></td><td class="r num">${brl(k.redondo)}</td>
      <td class="r num"><b>${brl(k.preco)}</b>${k.manual?'<div class="tsub">definido por você</div>':'<div class="tsub">sugerido</div>'}</td>
      <td class="r num">${brl(k.lucro)}</td><td class="r"><span class="chip ${st}">${pct(k.margemReal)}</span></td>
      <td><div class="row-actions"><button class="btn sm ghost" data-act="toggle" data-id="${p.id}">${open?'Fechar':'Detalhes'}</button>${editBtn('produto',p.id)}</div></td></tr>
      ${open?`<tr class="detail"><td colspan="10">${breakdown(p,k)}</td></tr>`:''}`}).join('');
  return `
  <div class="head"><div><h1>Precificação</h1><p>Custo de cada produto a partir dos insumos, do tempo de produção e das taxas. Mão de obra a ${brl(num(c.valorHora))}/h, margem padrão ${pct(num(c.margem))}, taxa de venda ${pct(num(c.taxa))}, perda ${pct(num(c.perda))}.</p></div>
    <div class="tools"><button class="btn ghost" data-act="tab" data-v="ajustes">Mudar padrões</button><button class="btn primary" data-act="new" data-kind="produto">+ Novo produto</button></div></div>
  ${ps.length?`<div class="tbl-wrap"><table><thead><tr><th>Produto</th><th class="r">Materiais</th><th class="r">Mão de obra</th><th class="r">Extras</th><th class="r">Custo total</th><th class="r">Sugerido</th><th class="r">Preço de venda</th><th class="r">Lucro / un</th><th class="r">Margem</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="note">O lucro já desconta a taxa da plataforma e paga seu tempo pelo valor-hora. Margem abaixo de 15% fica em vermelho, até 30% em amarelo. Custo dos insumos = média do que você pagou nas compras (aba Gastos), ou o valor informado no insumo.</div>`
  :empty('Nenhum produto cadastrado','Cadastre um produto com os insumos e o tempo que leva para fazer; o preço sugerido aparece na hora.','new','+ Novo produto')}`;
}
function breakdown(p,k){
  return `<div class="bk"><div><table><thead><tr><th>Insumo</th><th class="r">Usa por peça</th><th class="r">Custo unit.</th><th class="r">Subtotal</th></tr></thead><tbody>
  ${k.linhas.length?k.linhas.map(l=>`<tr><td>${esc(l.ins?.nome||'Insumo removido')}${num(l.rende)>1?`<div class="tsub">${fmt(l.qtd)} ${esc(l.ins?.unidade||'')} rende ${fmt(l.rende,0)} peças</div>`:''}</td><td class="r num">${fmt(l.q,4)} ${esc(l.ins?.unidade||'')}</td><td class="r num">${brl(l.u)}</td><td class="r num">${brl(l.sub)}</td></tr>`).join(''):'<tr><td colspan="4" class="tsub">Nenhum insumo ligado a este produto.</td></tr>'}
  </tbody></table></div>
  <div class="sum"><div><span class="k">Materiais</span><span class="num">${brl(k.mat)}</span></div><div><span class="k">Perda (${pct(num(cfg().perda))})</span><span class="num">${brl(k.perda)}</span></div><div><span class="k">Mão de obra (${fmt(p.tempoMin,0)} min)</span><span class="num">${brl(k.mo)}</span></div><div><span class="k">Extras</span><span class="num">${brl(k.extra)}</span></div>
  <div class="tot"><span>Custo total</span><span class="num">${brl(k.total)}</span></div>
  <div><span class="k">Margem ${pct(k.margem)} + taxa ${pct(k.taxa)}</span><span class="num">${brl(k.sugerido)}</span></div>
  <div><span class="k">Arredondado</span><span class="num">${brl(k.redondo)}</span></div>
  <div class="tot"><span>Lucro por peça a ${brl(k.preco)}</span><span class="num">${brl(k.lucro)}</span></div></div></div>`;
}

function vCatalogo(){
  let ps=[...S.produtos].sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  const filaN=ps.filter(p=>num(p.qtdImprimir)>0);
  if(ui.filaSo)ps=filaN;
  const fi=(l,v,cls='')=>`<div class="${cls}"><dt>${l}</dt><dd>${v===''||v==null?'—':esc(v)}</dd></div>`;
  const sg=v=>v===''||v==null?'':(num(v)>0?'+':'')+v;
  const cards=ps.map(p=>{const e=estoqueProd(p),q=num(p.qtdImprimir);return `<article class="pcard">
    <div class="ptop">${avatar(p,p.categoria==='Botton'?'':'sq')}<div style="min-width:0"><h3>${esc(p.nome)}</h3><div class="chips"><span class="chip">${esc(p.categoria||'Sem categoria')}</span><span class="chip ${e<=0?'bad':e<5?'warn':'good'}">${fmt(e,0)} prontas</span>${p.exemplo?'<span class="chip ex">exemplo</span>':''}</div></div></div>
    <dl class="ficha">${fi('Papel',p.papel,'wide')}${fi('Tamanho',p.tamanho)}${fi('Peças / folha',p.pecasFolha)}${fi('Qualidade',p.qualidade)}${fi('Densidade',p.densidade)}${fi('Brilho',sg(p.brilho))}${fi('Contraste',sg(p.contraste))}${fi('Saturação',sg(p.saturacao))}${fi('Impressora',p.impressora)}${p.obsImpressao?fi('Observações',p.obsImpressao,'wide'):''}</dl>
    <div class="pfoot"><div class="queue"><b>${fmt(q,0)}</b><span>para imprimir</span></div><div style="display:flex;gap:6px">${editBtn('produto',p.id)}${q>0?`<button class="btn sm primary" data-act="produzir" data-id="${p.id}">Registrar impressão</button>`:''}</div></div></article>`}).join('');
  return `
  <div class="head"><div><h1>Catálogo & impressão</h1><p>Cada produto com a arte, as peças prontas e a ficha de impressão. Registrar uma impressão desconta os insumos do estoque.</p></div>
    <div class="tools"><label class="check"><input type="checkbox" id="fFila" data-bind="filaSo" ${ui.filaSo?'checked':''}> Só a fila de impressão (${filaN.length})</label><button class="btn primary" data-act="new" data-kind="produto">+ Novo produto</button></div></div>
  ${ps.length?`<div class="cards">${cards}</div>`:ui.filaSo?empty('Fila de impressão vazia','Defina "quantidade para imprimir" em um produto para ele aparecer aqui.'):empty('Nenhum produto cadastrado','Adicione a arte, o papel e as configurações de cor que funcionam na sua impressora.','new','+ Novo produto')}`;
}

function vInsumos(){
  const list=[...S.insumos].map(i=>({i,m:movIns(i),c:custoUnit(i)})).sort((a,b)=>(a.i.nome||'').localeCompare(b.i.nome||''));
  const valor=list.reduce((a,x)=>a+Math.max(0,x.m.estoque)*x.c.valor,0);
  const rows=list.map(({i,m,c})=>{const [l,cl]=insStatus(i,m.estoque);return `<tr>
    <td><div class="tname">${esc(i.nome)}${exChip(i)}</div><div class="tsub">${esc(i.categoria||'')}${i.fornecedor?' · '+esc(i.fornecedor):''}</div></td>
    <td class="r num"><b>${fmt(m.estoque)}</b> ${esc(i.unidade||'un')}</td><td><span class="chip ${cl}"><i></i>${l}</span></td>
    <td class="r num">${num(i.estoqueMin)?fmt(i.estoqueMin):'—'}</td>
    <td class="r num">${brl(c.valor)}<div class="tsub">${c.fonte==='compras'?`média de ${c.n} compra${c.n>1?'s':''}`:'valor informado'}</div></td>
    <td class="r num">${fmt(num(i.estoqueInicial)+m.comprado)}</td><td class="r num">${fmt(m.usado)}</td>
    <td class="r num">${brl(Math.max(0,m.estoque)*c.valor)}</td>
    <td><div class="row-actions"><button class="btn sm ghost" data-act="comprar" data-id="${i.id}">Comprei</button>${editBtn('insumo',i.id)}</div></td></tr>`}).join('');
  return `
  <div class="head"><div><h1>Insumos</h1><p>Estoque = estoque inicial + compras lançadas em Gastos − o que foi usado nas impressões registradas.</p></div>
    <div class="tools"><button class="btn primary" data-act="new" data-kind="insumo">+ Novo insumo</button></div></div>
  ${list.length?`<div class="tbl-wrap"><table><thead><tr><th>Insumo</th><th class="r">Em estoque</th><th>Situação</th><th class="r">Mínimo</th><th class="r">Custo / unid.</th><th class="r">Entrou</th><th class="r">Usado</th><th class="r">Valor parado</th><th></th></tr></thead><tbody>${rows}</tbody>
  <tfoot><tr><td colspan="7">Valor total em estoque</td><td class="r num">${brl(valor)}</td><td></td></tr></tfoot></table></div>`
  :empty('Nenhum insumo cadastrado','Cadastre papéis, bases de botton, argolas, embalagens… e use-os na receita de cada produto.','new','+ Novo insumo')}`;
}

function vGastos(){
  const k=ui.gMes, gs=S.gastos.filter(g=>!k||(g.data||'').startsWith(k)).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const tot=gs.reduce((a,g)=>a+gastoTotal(g),0), porCat={};
  gs.forEach(g=>porCat[g.categoria||'Outros']=(porCat[g.categoria||'Outros']||0)+gastoTotal(g));
  const rows=gs.map(g=>{const ins=insById(g.insumoId);return `<tr><td class="num">${dataBR(g.data)}</td>
    <td><div class="tname">${esc(g.descricao)}${exChip(g)}</div><div class="tsub">${esc(g.loja||'')}${g.nf?' · NF '+esc(g.nf):''}</div></td>
    <td><span class="chip">${esc(g.categoria||'Outros')}</span></td>
    <td>${ins?`<span class="chip blue">+${fmt(g.qtd)} ${esc(ins.unidade||'un')}</span> <span class="tsub">${esc(ins.nome)}</span>`:'<span class="tsub">—</span>'}</td>
    <td class="r num">${brl(num(g.valor))}</td><td class="r num">${num(g.frete)?brl(num(g.frete)):'—'}</td><td class="r num"><b>${brl(gastoTotal(g))}</b></td>
    <td><div class="row-actions">${editBtn('gasto',g.id)}</div></td></tr>`}).join('');
  return `
  <div class="head"><div><h1>Gastos</h1><p>Tudo o que saiu do caixa da loja. Compras ligadas a um insumo entram no estoque e atualizam o custo médio.</p></div>
    <div class="tools"><button class="icon-btn" data-act="gmes" data-d="-1" aria-label="Mês anterior">‹</button><input type="month" id="fgMes" value="${k}" data-bind="gMes" aria-label="Mês"><button class="icon-btn" data-act="gmes" data-d="1" aria-label="Próximo mês">›</button><button class="btn ghost" data-act="gall">${k?'Ver todos':'Só este mês'}</button><button class="btn primary" data-act="new" data-kind="gasto">+ Novo gasto</button></div></div>
  <div class="kpis auto"><div class="kpi hl"><span>Total ${k?mesLabel(k):'geral'}</span><b class="num">${brl(tot)}</b><small>${gs.length} lançamento${gs.length===1?'':'s'}</small></div>
    ${Object.entries(porCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="kpi"><span>${esc(c)}</span><b class="num">${brl(v)}</b><small>${pct(v/tot*100)} do total</small></div>`).join('')}</div>
  ${gs.length?`<div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Entrou no estoque</th><th class="r">Valor</th><th class="r">Frete</th><th class="r">Total</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
  :empty('Nenhum gasto '+(k?'em '+mesLabel(k):'lançado'),'Lance compras de material, equipamentos, fretes e assinaturas para saber quanto a loja gasta por mês.','new','+ Novo gasto')}`;
}

function vPedidos(){
  let os=[...S.pedidos].sort((a,b)=>(b.data||'').localeCompare(a.data||'')||(b.numero||'').localeCompare(a.numero||''));
  if(ui.pStatus==='abertos')os=os.filter(o=>o.status==='novo'||o.status==='produzindo'||o.status==='enviado');
  else if(ui.pStatus)os=os.filter(o=>o.status===ui.pStatus);
  if(ui.pCanal)os=os.filter(o=>o.canal===ui.pCanal);
  const canais=[...new Set([...CANAIS,...S.pedidos.map(o=>o.canal).filter(Boolean)])];
  const rows=os.map(o=>{const t=totPedido(o);return `<tr><td class="num">${dataBR(o.data)}</td>
    <td><div class="tname">#${esc(o.numero||'—')}${exChip(o)}</div><div class="tsub">${esc(o.cliente||'')}</div></td>
    <td>${esc(o.canal||'—')}</td>
    <td><div class="tsub" style="max-width:240px">${(o.itens||[]).map(i=>`${fmt(i.qtd,0)}× ${esc(prodById(i.produtoId)?.nome||'produto removido')}`).join(', ')||'—'}</div></td>
    <td class="r num"><b>${brl(t.total)}</b></td><td class="r num">${brl(t.liquido)}</td>
    <td>${o.nf?`<span class="chip good">NF ${esc(o.nf)}</span>`:'<span class="chip warn">sem NF</span>'}</td>
    <td><select data-act="status" data-id="${o.id}" id="st-${o.id}" aria-label="Status do pedido">${Object.entries(STATUS).map(([k,[l]])=>`<option value="${k}" ${o.status===k?'selected':''}>${l}</option>`).join('')}</select></td>
    <td><div class="row-actions">${editBtn('pedido',o.id)}</div></td></tr>`}).join('');
  const all=S.pedidos.filter(o=>o.status!=='cancelado'), semNF=all.filter(o=>!o.nf).length;
  return `
  <div class="head"><div><h1>Pedidos</h1><p>Cada venda, por onde veio, quanto rendeu de verdade e a nota fiscal. Pedidos baixam o estoque de peças prontas.</p></div>
    <div class="tools"><select id="fStatus" data-bind="pStatus" aria-label="Filtrar status"><option value="abertos" ${ui.pStatus==='abertos'?'selected':''}>Em andamento</option><option value="" ${!ui.pStatus?'selected':''}>Todos</option>${Object.entries(STATUS).map(([k,[l]])=>`<option value="${k}" ${ui.pStatus===k?'selected':''}>${l}</option>`).join('')}</select>
    <select id="fCanal" data-bind="pCanal" aria-label="Filtrar canal"><option value="">Todos os canais</option>${canais.map(c=>`<option ${ui.pCanal===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <button class="btn primary" data-act="new" data-kind="pedido">+ Novo pedido</button></div></div>
  ${semNF?`<div class="note warn">${semNF} pedido${semNF>1?'s':''} sem nota fiscal registrada.</div>`:''}
  ${os.length?`<div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Pedido</th><th>Canal</th><th>Itens</th><th class="r">Total</th><th class="r">Líquido</th><th>Nota fiscal</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
  :empty(S.pedidos.length?'Nenhum pedido com esse filtro':'Nenhum pedido ainda','Registre as vendas de cada canal para acompanhar faturamento e estoque.','new','+ Novo pedido')}`;
}

function vProducao(){
  const ls=[...S.producoes].sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const rows=ls.map(x=>{const p=prodById(x.produtoId);return `<tr><td class="num">${dataBR(x.data)}</td>
    <td><div class="tname">${esc(p?.nome||'Produto removido')}${exChip(x)}</div>${x.obs?`<div class="tsub">${esc(x.obs)}</div>`:''}</td>
    <td class="r num"><b>${fmt(x.qtd,0)}</b></td>
    <td><div class="tsub">${(x.consumo||[]).map(c=>{const i=insById(c.insumoId);return `${fmt(c.qtd,3)} ${esc(i?.unidade||'')} ${esc(i?.nome||'?')}`}).join(' · ')||'—'}</div></td>
    <td><div class="row-actions">${delBtn('producoes',x.id)}</div></td></tr>`}).join('');
  return `
  <div class="head"><div><h1>Produção</h1><p>Cada lote impresso ou montado. Registrar um lote soma peças prontas e desconta os insumos pela receita do produto.</p></div>
    <div class="tools"><button class="btn primary" data-act="new" data-kind="producao">+ Registrar lote</button></div></div>
  ${ls.length?`<div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Produto</th><th class="r">Peças</th><th>Insumos usados</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="note">Excluir um lote devolve os insumos ao estoque e tira as peças prontas.</div>`
  :empty('Nenhum lote registrado','Quando imprimir ou montar peças, registre aqui para o estoque de insumos se atualizar sozinho.','new','+ Registrar lote')}`;
}

function tarefasUrgentes(){const h=today();return S.tarefas.filter(t=>!t.feito&&t.prazo&&t.prazo<=h).sort((a,b)=>a.prazo.localeCompare(b.prazo))}
function prazoLabel(p){if(!p)return'';const h=today();if(p===h)return'Hoje';if(p===addDays(h,1))return'Amanhã';if(p===addDays(h,-1))return'Ontem';const [y,m,d]=p.split('-');return d+'/'+m+(y!==h.slice(0,4)?'/'+y.slice(2):'')}
function taskItem(t){
  const h=today(),atrasada=!t.feito&&t.prazo&&t.prazo<h,pr=PRIORIDADES[t.prioridade]||PRIORIDADES.media;
  return `<div class="task${t.feito?' done':''}">
    <button type="button" class="tcheck" data-act="toggleTask" data-id="${t.id}" aria-pressed="${!!t.feito}" aria-label="${t.feito?'Reabrir':'Concluir'}: ${esc(t.titulo)}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg></button>
    <div class="tmain"><div class="ttitle">${esc(t.titulo)}${exChip(t)}</div>
      <div class="tmeta">${t.prazo?`<span class="chip ${atrasada?'bad':t.prazo===h?'pink':''}">${prazoLabel(t.prazo)}</span>`:''}${t.prioridade&&t.prioridade!=='media'?`<span class="chip ${pr[1]}">${pr[0]}</span>`:''}${t.etiqueta?`<span class="chip blue">${esc(t.etiqueta)}</span>`:''}${t.feito&&t.feitoEm?`<span class="tsub">feita em ${dataBR(t.feitoEm.slice(0,10))}</span>`:''}</div>
      ${t.notas?`<div class="tnotes">${esc(t.notas)}</div>`:''}</div>
    <div class="row-actions">${editBtn('tarefa',t.id)}</div></div>`;
}
function vTarefas(){
  const h=today(),em7=addDays(h,7);
  let ts=S.tarefas;if(ui.tTag)ts=ts.filter(t=>t.etiqueta===ui.tTag);
  const pend=ts.filter(t=>!t.feito),feitas=ts.filter(t=>t.feito).sort((a,b)=>(b.feitoEm||'').localeCompare(a.feitoEm||''));
  const ord=(a,b)=>(a.prazo||'9999').localeCompare(b.prazo||'9999')||(PRIORIDADES[b.prioridade]||PRIORIDADES.media)[2]-(PRIORIDADES[a.prioridade]||PRIORIDADES.media)[2]||(a.criadoEm||'').localeCompare(b.criadoEm||'');
  const grupos=[['Atrasadas',t=>t.prazo&&t.prazo<h],['Hoje',t=>t.prazo===h],['Próximos 7 dias',t=>t.prazo>h&&t.prazo<=em7],['Mais para frente',t=>t.prazo>em7],['Sem prazo',t=>!t.prazo]];
  const blocoP=grupos.map(([n,f])=>{const g=pend.filter(f).sort(ord);return g.length?`<section class="tgroup"><h2>${n} <small>${g.length}</small></h2><div class="tlist">${g.map(taskItem).join('')}</div></section>`:''}).join('');
  const blocoF=feitas.length?`<section class="tgroup"><h2>Concluídas <small>${feitas.length}</small><button class="btn sm ghost danger" data-act="limparFeitas">Apagar concluídas</button></h2><div class="tlist">${feitas.map(taskItem).join('')}</div></section>`:'';
  const tags=[...new Set([...ETIQUETAS,...S.tarefas.map(t=>t.etiqueta).filter(Boolean)])];
  const corpo=ui.tFiltro==='feitas'?blocoF:ui.tFiltro==='todas'?blocoP+blocoF:blocoP;
  const vazioTxt=!S.tarefas.length?empty('Nenhuma tarefa ainda','Anote o que precisa fazer: imprimir um lote, responder um cliente, comprar papel, postar no Instagram.')
    :empty(ui.tFiltro==='feitas'?'Nenhuma tarefa concluída':'Nada pendente por aqui','Use o campo acima para adicionar uma tarefa.');
  return `
  <div class="head"><span class="spark" style="width:16px;height:16px;right:30%;top:0;color:var(--pink)" aria-hidden="true"></span>
    <div><h1>Lista de <em class="lime">tarefas</em></h1><p>${pend.length} pendente${pend.length===1?'':'s'}${tarefasUrgentes().length?` · ${tarefasUrgentes().length} para hoje ou atrasada${tarefasUrgentes().length===1?'':'s'}`:''}. Clique no círculo para concluir.</p></div>
    <div class="tools"><select id="fTFiltro" data-bind="tFiltro" aria-label="Mostrar"><option value="pendentes" ${ui.tFiltro==='pendentes'?'selected':''}>Pendentes</option><option value="feitas" ${ui.tFiltro==='feitas'?'selected':''}>Concluídas</option><option value="todas" ${ui.tFiltro==='todas'?'selected':''}>Todas</option></select>
    <select id="fTTag" data-bind="tTag" aria-label="Etiqueta"><option value="">Todas as etiquetas</option>${tags.map(t=>`<option ${ui.tTag===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div></div>
  <form class="quickadd" id="taskQuick" autocomplete="off">
    <input id="tq-titulo" placeholder="Nova tarefa… ex.: imprimir bottons do pedido 1042" aria-label="Nova tarefa" maxlength="200">
    <input type="date" id="tq-prazo" aria-label="Prazo">
    <select id="tq-pri" aria-label="Prioridade"><option value="media">Prioridade média</option><option value="alta">Prioridade alta</option><option value="baixa">Prioridade baixa</option></select>
    <button class="btn primary" type="submit">Adicionar</button>
  </form>
  ${corpo.trim()?corpo:vazioTxt}`;
}
function formTarefa(id){
  const t=id?S.tarefas.find(x=>x.id===id):{prioridade:'media',etiqueta:ui.tTag||''};
  openDrawer(id?'Editar tarefa':'Nova tarefa','tarefa',id,`
  <fieldset><div class="fg">
    ${F('titulo','Tarefa',t.titulo,{cls:'full',req:true,ph:'Ex.: comprar argolas para chaveiro'})}
    ${F('prazo','Prazo',t.prazo,{type:'date'})}
    ${F('prioridade','Prioridade',t.prioridade,{type:'select',opts:Object.entries(PRIORIDADES).map(([k,[l]])=>[k,l])})}
    ${F('etiqueta','Etiqueta',t.etiqueta,{list:'dlEtq',ph:'Ex.: Produção'})}
    <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="feito" id="f-feito" ${t.feito?'checked':''}> Concluída</label>
    ${F('notas','Notas',t.notas,{type:'textarea',cls:'full'})}
  </div></fieldset>${dl('dlEtq',ETIQUETAS)}`,footDel('tarefas',id));
}

function vAjustes(){
  const c=cfg(), ex=COLS.reduce((a,k)=>a+S[k].filter(r=>r.exemplo).length,0);
  return `
  <div class="head"><div><h1>Ajustes</h1><p>Os valores padrão usados na precificação. Cada produto pode sobrescrever margem e taxa.</p></div></div>
  <form class="panel" id="cfgForm" style="display:flex;flex-direction:column;gap:16px;max-width:720px">
    <div class="fg">
      <label class="field full"><span>Nome da loja</span><input id="c-nome" name="nomeLoja" value="${esc(c.nomeLoja)}"></label>
      <label class="field"><span>Seu valor-hora (R$)</span><input id="c-vh" name="valorHora" inputmode="decimal" value="${esc(c.valorHora)}"><small>Quanto você quer ganhar por hora de trabalho.</small></label>
      <label class="field"><span>Margem de lucro padrão (%)</span><input id="c-mg" name="margem" inputmode="decimal" value="${esc(c.margem)}"><small>Somada sobre o custo total.</small></label>
      <label class="field"><span>Taxa de venda padrão (%)</span><input id="c-tx" name="taxa" inputmode="decimal" value="${esc(c.taxa)}"><small>Comissão da plataforma + meio de pagamento.</small></label>
      <label class="field"><span>Perda / desperdício (%)</span><input id="c-pd" name="perda" inputmode="decimal" value="${esc(c.perda)}"><small>Impressões erradas, cortes, testes.</small></label>
    </div>
    <div><button class="btn primary" type="submit">Salvar ajustes</button></div>
  </form>
  <section class="panel" style="max-width:720px;display:flex;flex-direction:column;gap:12px"><h2>Dados</h2>
    <div class="tsub">${mode==='nuvem'?`Conta: <b>${esc(user?.email||'')}</b>. Os dados ficam no Supabase e aparecem em qualquer aparelho em que você entrar.`:'Modo demonstração: os dados ficam só neste navegador. Preencha <span class="mono">config.js</span> com as chaves do Supabase para salvar na nuvem.'}
    ${S.produtos.length} produtos · ${S.insumos.length} insumos · ${S.gastos.length} gastos · ${S.pedidos.length} pedidos · ${S.producoes.length} lotes.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="backup">Baixar backup (JSON)</button><label class="btn" for="f-restore">Restaurar backup…</label><input type="file" id="f-restore" accept="application/json,.json" hidden>
    ${ex?`<button class="btn danger" data-act="limparEx">Apagar ${ex} registros de exemplo</button>`:'<button class="btn" data-act="exemplos">Carregar dados de exemplo</button>'}</div>
    <div class="tsub">Restaurar um backup adiciona os registros dele e substitui os que tiverem o mesmo código; nada é apagado.</div>
  </section>`;
}

/* ============ forms (drawer) ============ */
let drawer=null;
function openDrawer(title,kind,id,body,foot=''){
  $('#drawerRoot').innerHTML=`<div class="overlay" data-act="close"></div><form class="drawer" id="dForm" data-kind="${kind}" data-id="${id||''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
   <div class="dhead"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-act="close" aria-label="Fechar">✕</button></div>
   <div class="dbody">${body}</div>
   <div class="dfoot">${foot}<div class="right"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div></form>`;
  drawer=$('#dForm'); setTimeout(()=>{const f=drawer&&drawer.querySelector('input:not([type=hidden]):not([type=file]),select');f&&f.focus()},30);
}
function closeDrawer(){$('#drawerRoot').innerHTML='';drawer=null}
const F=(name,label,val,o={})=>`<label class="field ${o.cls||''}"><span>${label}</span>${o.type==='select'?`<select name="${name}" id="f-${name}">${o.opts.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return `<option value="${esc(v)}" ${String(val??'')===String(v)?'selected':''}>${esc(l)}</option>`}).join('')}</select>`:o.type==='textarea'?`<textarea name="${name}" id="f-${name}" rows="2">${esc(val)}</textarea>`:`<input name="${name}" id="f-${name}" value="${esc(val??'')}" ${o.type?`type="${o.type}"`:''} ${o.dec?'inputmode="decimal"':''} ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.list?`list="${o.list}"`:''} ${o.req?'required':''}>`}${o.help?`<small>${o.help}</small>`:''}</label>`;
const dl=(id,arr)=>`<datalist id="${id}">${arr.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`;
const footDel=(col,id)=>id?delBtn(col,id).replace('btn sm ghost','btn ghost'):'';

function formInsumo(id,pre={}){
  const i=id?insById(id):{unidade:'un',...pre};
  openDrawer(id?'Editar insumo':'Novo insumo','insumo',id,`
  <fieldset><div class="fg">
    ${F('nome','Nome',i.nome,{cls:'full',req:true,ph:'Ex.: Papel couché 250g A4'})}
    ${F('categoria','Categoria',i.categoria,{list:'dlCatIns'})}
    ${F('unidade','Unidade de medida',i.unidade,{type:'select',opts:UNIDADES})}
    ${F('custoManual','Custo por unidade (R$)',i.custoManual,{dec:true,help:'Usado até você lançar a primeira compra deste insumo em Gastos.'})}
    ${F('estoqueInicial','Estoque inicial / ajuste',i.estoqueInicial,{dec:true,help:'O que você já tinha antes de usar o painel.'})}
    ${F('estoqueMin','Avisar quando ficar abaixo de',i.estoqueMin,{dec:true})}
    ${F('fornecedor','Fornecedor',i.fornecedor)}
    ${F('obs','Observações',i.obs,{type:'textarea',cls:'full'})}
  </div></fieldset>${dl('dlCatIns',CAT_INS)}`,footDel('insumos',id));
}

function insOptions(sel){return `<option value="">Escolha…</option>`+[...S.insumos].sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(i=>`<option value="${i.id}" ${sel===i.id?'selected':''}>${esc(i.nome)} (${esc(i.unidade||'un')})</option>`).join('')}
function prodOptions(sel){return `<option value="">Escolha…</option>`+[...S.produtos].sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}
const rowIns=(it={})=>{const k=newId();return `<div class="lrow" data-row="ins">
  <label class="field"><span>Insumo</span><select data-f="insumoId" id="ri-${k}">${insOptions(it.insumoId)}</select></label>
  <label class="field"><span>Quantidade</span><input data-f="qtd" id="rq-${k}" inputmode="decimal" value="${esc(it.qtd??1)}"></label>
  <label class="field"><span>Rende (peças)</span><input data-f="rende" id="rr-${k}" inputmode="decimal" value="${esc(it.rende??1)}"></label>
  <button type="button" class="icon-btn" data-act="rmrow" aria-label="Remover linha">✕</button><div class="sub"></div></div>`};

function formProduto(id){
  const p=id?prodById(id):{insumos:[],qualidade:'Alta',tempoMin:5};
  const c=cfg();
  openDrawer(id?'Editar produto':'Novo produto','produto',id,`
  <fieldset><legend>Produto</legend><div class="fg">
    ${F('nome','Nome',p.nome,{cls:'full',req:true,ph:'Ex.: Botton Gatinho Lunar 38mm'})}
    ${F('categoria','Categoria',p.categoria,{list:'dlCatProd'})}
    ${F('sku','Código / SKU',p.sku,{ph:'opcional'})}
    <div class="field full"><span>Imagem da arte</span><div class="imgpick"><div id="imgPrev">${avatar(p)}</div><input type="file" id="f-img" accept="image/png,image/jpeg,image/webp,image/gif"><input type="hidden" name="imagem" id="f-imagem" value="${esc(p.imagem||'')}"></div><small id="imgMsg">PNG, JPG ou WEBP, até 10 MB.</small></div>
  </div></fieldset>
  <fieldset><legend>Insumos usados por peça</legend>
    <div class="tsub">Use "rende" quando um insumo vira várias peças. Ex.: 1 folha A4 rende 12 bottons de 38mm.</div>
    <div class="rows" id="rowsIns">${(p.insumos||[]).map(rowIns).join('')}</div>
    <div>${S.insumos.length?'<button type="button" class="btn sm" data-act="addIns">+ Adicionar insumo</button>':'<span class="note warn">Cadastre insumos primeiro na aba Insumos.</span>'}</div>
  </fieldset>
  <fieldset><legend>Tempo e preço</legend><div class="fg">
    ${F('tempoMin','Tempo de produção por peça (min)',p.tempoMin,{dec:true})}
    ${F('custoExtra','Outros custos por peça (R$)',p.custoExtra,{dec:true,help:'Embalagem, brinde, tag… se não estiverem nos insumos.'})}
    ${F('margem','Margem de lucro (%)',p.margem,{dec:true,ph:'padrão '+c.margem+'%'})}
    ${F('taxa','Taxa de venda (%)',p.taxa,{dec:true,ph:'padrão '+c.taxa+'%'})}
    ${F('preco','Preço de venda (R$)',p.preco,{dec:true,ph:'vazio = usar sugerido',cls:'full',help:'Deixe vazio para usar o preço sugerido arredondado.'})}
  </div><div class="preview" id="calcPrev"></div></fieldset>
  <fieldset><legend>Impressão</legend><div class="fg3">
    ${F('qtdImprimir','Quantidade para imprimir',p.qtdImprimir,{dec:true})}
    ${F('tamanho','Tamanho',p.tamanho,{ph:'Ex.: A5, 38mm, 10×15'})}
    ${F('pecasFolha','Peças por folha',p.pecasFolha,{dec:true})}
    ${F('papel','Tipo de papel',p.papel,{list:'dlPapel',cls:'full'})}
    ${F('qualidade','Qualidade',p.qualidade,{type:'select',opts:QUALIDADES})}
    ${F('densidade','Densidade',p.densidade,{ph:'Ex.: +1, 3, média'})}
    ${F('impressora','Impressora',p.impressora,{ph:'Ex.: Epson L3250'})}
    ${F('brilho','Brilho',p.brilho,{dec:true,ph:'0'})}
    ${F('contraste','Contraste',p.contraste,{dec:true,ph:'0'})}
    ${F('saturacao','Saturação',p.saturacao,{dec:true,ph:'0'})}
    ${F('obsImpressao','Observações de impressão',p.obsImpressao,{type:'textarea',cls:'full'})}
  </div></fieldset>
  <fieldset><legend>Estoque</legend><div class="fg">
    ${F('estoqueInicial','Peças prontas que você já tinha',p.estoqueInicial,{dec:true,help:'Depois disso, o estoque sobe com a Produção e desce com os Pedidos.'})}
  </div></fieldset>
  ${dl('dlCatProd',CAT_PROD)}${dl('dlPapel',PAPEIS)}`,footDel('produtos',id));
  updCalc();
}
function readRows(type){return $$(`[data-row="${type}"]`,drawer).map(r=>{const o={};$$('[data-f]',r).forEach(e=>o[e.dataset.f]=e.value);return o})}
function updCalc(){
  if(!drawer||drawer.dataset.kind!=='produto')return;
  const fd=Object.fromEntries(new FormData(drawer)); fd.insumos=readRows('ins');
  $$('[data-row="ins"]',drawer).forEach(r=>{const i=insById($('[data-f=insumoId]',r).value);const q=num($('[data-f=qtd]',r).value)/(num($('[data-f=rende]',r).value)||1);
    $('.sub',r).textContent=i?`${fmt(q,4)} ${i.unidade||'un'} × ${brl(custoUnit(i).valor)} = ${brl(q*custoUnit(i).valor)} por peça`:''});
  const k=custo(null,fd);
  $('#calcPrev').innerHTML=`<div><span>Custo total</span><b>${brl(k.total)}</b></div><div><span>Sugerido</span><b>${brl(k.redondo)}</b></div><div class="big"><span>Lucro / peça</span><b>${brl(k.lucro)}</b></div>
   <div class="line">materiais ${brl(k.mat)} + perda ${brl(k.perda)} + mão de obra ${brl(k.mo)} + extras ${brl(k.extra)} · vendendo a ${brl(k.preco)} a margem real fica em ${pct(k.margemReal)}</div>`;
}

function formGasto(id,pre={}){
  const g=id?S.gastos.find(x=>x.id===id):{data:today(),categoria:'Insumo',...pre};
  openDrawer(id?'Editar gasto':'Novo gasto','gasto',id,`
  <fieldset><div class="fg">
    ${F('data','Data',g.data,{type:'date',req:true})}
    ${F('categoria','Categoria',g.categoria,{type:'select',opts:CAT_GASTO})}
    ${F('descricao','Descrição',g.descricao,{cls:'full',req:true,ph:'Ex.: 2 pacotes de papel couché'})}
    ${F('loja','Onde comprou',g.loja,{ph:'Ex.: Kalunga, Shopee'})}
    ${F('nf','Nota fiscal / recibo',g.nf,{ph:'opcional'})}
    ${F('valor','Valor pago (R$)',g.valor,{dec:true,req:true})}
    ${F('frete','Frete (R$)',g.frete,{dec:true})}
  </div></fieldset>
  <fieldset><legend>Entrou no estoque?</legend><div class="fg">
    <label class="field"><span>Insumo comprado</span><select name="insumoId" id="f-insumoId">${insOptions(g.insumoId).replace('Escolha…','Não é um insumo')}</select></label>
    ${F('qtd','Quantidade comprada',g.qtd,{dec:true,help:'Na unidade do insumo. Ex.: 2 pacotes de 50 folhas = 100.'})}
  </div></fieldset>`,footDel('gastos',id));
}

const rowPed=(it={})=>{const k=newId();return `<div class="lrow" data-row="ped">
  <label class="field"><span>Produto</span><select data-f="produtoId" id="pp-${k}">${prodOptions(it.produtoId)}</select></label>
  <label class="field"><span>Qtd</span><input data-f="qtd" id="pq-${k}" inputmode="decimal" value="${esc(it.qtd??1)}"></label>
  <label class="field"><span>Preço un. (R$)</span><input data-f="preco" id="pv-${k}" inputmode="decimal" value="${esc(it.preco??'')}"></label>
  <button type="button" class="icon-btn" data-act="rmrow" aria-label="Remover linha">✕</button><div class="sub"></div></div>`};
function formPedido(id){
  const o=id?S.pedidos.find(x=>x.id===id):{data:today(),status:'novo',itens:[{}]};
  openDrawer(id?'Pedido #'+(o.numero||''):'Novo pedido','pedido',id,`
  <fieldset><div class="fg">
    ${F('data','Data',o.data,{type:'date',req:true})}
    ${F('numero','Número do pedido',o.numero,{ph:'Ex.: 1042'})}
    ${F('canal','Canal de venda',o.canal,{list:'dlCanal',ph:'Instagram, Shopee…'})}
    ${F('cliente','Cliente',o.cliente)}
    ${F('status','Status',o.status,{type:'select',opts:Object.entries(STATUS).map(([k,[l]])=>[k,l])})}
    ${F('nf','Nota fiscal (número)',o.nf,{ph:'deixe vazio se ainda não emitiu'})}
  </div></fieldset>
  <fieldset><legend>Itens</legend><div class="rows" id="rowsPed">${(o.itens||[]).map(rowPed).join('')}</div>
    <div>${S.produtos.length?'<button type="button" class="btn sm" data-act="addPed">+ Adicionar item</button>':'<span class="note warn">Cadastre produtos primeiro.</span>'}</div></fieldset>
  <fieldset><legend>Valores</legend><div class="fg">
    ${F('freteCobrado','Frete cobrado do cliente (R$)',o.freteCobrado,{dec:true})}
    ${F('desconto','Desconto (R$)',o.desconto,{dec:true})}
    ${F('taxaValor','Taxa da plataforma (R$)',o.taxaValor,{dec:true,help:'Comissão + tarifa do pagamento.'})}
    ${F('custoEnvio','Custo real do envio (R$)',o.custoEnvio,{dec:true})}
    ${F('rastreio','Código de rastreio',o.rastreio,{cls:'full'})}
    ${F('obs','Observações',o.obs,{type:'textarea',cls:'full'})}
  </div><div class="preview" id="pedPrev"></div></fieldset>${dl('dlCanal',CANAIS)}`,footDel('pedidos',id));
  updPed();
}
function updPed(){
  if(!drawer||drawer.dataset.kind!=='pedido')return;
  const fd=Object.fromEntries(new FormData(drawer)); fd.itens=readRows('ped');
  const t=totPedido(fd), cfgTx=num(cfg().taxa);
  $('#pedPrev').innerHTML=`<div><span>Subtotal</span><b>${brl(t.sub)}</b></div><div><span>Total</span><b>${brl(t.total)}</b></div><div class="big"><span>Líquido</span><b>${brl(t.liquido)}</b></div>
  <div class="line">${t.pecas} peça${t.pecas===1?'':'s'}${!num(fd.taxaValor)&&t.total?` · taxa estimada pelo padrão (${pct(cfgTx)}): ${brl(t.total*cfgTx/100)}`:''}</div>`;
}

function formProducao(prodId){
  const p=prodId?prodById(prodId):null;
  openDrawer('Registrar lote','producao',null,`
  <fieldset><div class="fg">
    ${F('data','Data',today(),{type:'date',req:true})}
    <label class="field"><span>Produto</span><select name="produtoId" id="f-produtoId" required>${prodOptions(prodId)}</select></label>
    ${F('qtd','Peças produzidas',p?num(p.qtdImprimir)||'':'',{dec:true,req:true})}
    <label class="check" style="align-self:end;padding-bottom:9px"><input type="checkbox" name="zerarFila" id="f-zerar" ${p&&num(p.qtdImprimir)?'checked':''}> Tirar da fila de impressão</label>
    ${F('obs','Observações',p?'':'',{type:'textarea',cls:'full',ph:'Ex.: reimpressão, ajustei saturação…'})}
  </div></fieldset>
  <fieldset><legend>Vai descontar do estoque</legend><div id="consPrev" class="rows"></div></fieldset>`);
  updProd();
}
function consumoDe(p,q){return (p?.insumos||[]).filter(it=>it.insumoId).map(it=>({insumoId:it.insumoId,qtd:num(it.qtd)/(num(it.rende)||1)*q}))}
function updProd(){
  if(!drawer||drawer.dataset.kind!=='producao')return;
  const p=prodById($('#f-produtoId').value), q=num($('#f-qtd').value), cs=consumoDe(p,q);
  $('#consPrev').innerHTML=!p?'<div class="tsub">Escolha um produto.</div>':!cs.length?'<div class="note warn">Este produto não tem insumos na receita; nada será descontado.</div>':
    cs.map(c=>{const i=insById(c.insumoId),e=i?movIns(i).estoque:0,falta=c.qtd>e;return `<div class="alert"><span class="chip ${falta?'bad':'good'}"><i></i>${falta?'Falta':'Ok'}</span><div><b>${fmt(c.qtd,3)} ${esc(i?.unidade||'')}</b> de ${esc(i?.nome||'?')} <span class="tsub">· tem ${fmt(e)}</span></div></div>`}).join('');
}

async function submitDrawer(){
  const kind=drawer.dataset.kind, id=drawer.dataset.id||newId(), fd=Object.fromEntries(new FormData(drawer));
  const prev=(drawer.dataset.id&&{insumo:insById,produto:prodById,gasto:x=>S.gastos.find(g=>g.id===x),pedido:x=>S.pedidos.find(o=>o.id===x),tarefa:x=>S.tarefas.find(t=>t.id===x)}[kind]?.(id))||{};
  let col,obj;
  if(kind==='insumo'){col='insumos';obj={...fd}}
  else if(kind==='tarefa'){col='tarefas';obj={...fd,feito:!!fd.feito};if(obj.feito&&!prev.feito)obj.feitoEm=new Date().toISOString();else if(obj.feito)obj.feitoEm=prev.feitoEm||'';else obj.feitoEm=''}
  else if(kind==='produto'){col='produtos';obj={...fd,insumos:readRows('ins').filter(r=>r.insumoId)}}
  else if(kind==='gasto'){col='gastos';obj={...fd};if(!obj.insumoId)obj.qtd=''}
  else if(kind==='pedido'){col='pedidos';obj={...fd,itens:readRows('ped').filter(r=>r.produtoId)}}
  else if(kind==='producao'){
    const p=prodById(fd.produtoId),q=num(fd.qtd);if(!p||q<=0){toast('Escolha o produto e a quantidade.');return}
    await save('producoes',id,{data:fd.data,produtoId:p.id,qtd:q,obs:fd.obs||'',consumo:consumoDe(p,q)});
    if(fd.zerarFila)await save('produtos',p.id,{...p,qtdImprimir:0});
    closeDrawer();toast(`${fmt(q,0)} peças registradas`);return;
  }
  if(prev.exemplo)obj.exemplo=true;
  if(prev.criadoEm)obj.criadoEm=prev.criadoEm; else obj.criadoEm=new Date().toISOString();
  try{await save(col,id,obj);closeDrawer();toast('Salvo')}catch(e){toast(e&&e.code==='quota_exceeded'?'O armazenamento do painel está cheio.':'Não foi possível salvar. Tente de novo.')}
}

async function pickImage(file){
  const msg=$('#imgMsg');
  if(!file)return;
  try{
    msg.textContent='Enviando…';const r=await uploadImage(file);$('#f-imagem').value=r.id;$('#imgPrev').innerHTML=`<div class="pimg"><img src="${esc(r.url)}" alt=""></div>`;msg.textContent='Imagem salva.';
  }catch(e){msg.textContent=e.message||'Não foi possível salvar a imagem.'}
}

/* ============ eventos ============ */
let armed=null;
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b||b.tagName==='SELECT')return;
  const a=b.dataset.act;
  if(a!=='del'&&a!=='limparEx'&&a!=='limparFeitas'&&armed){armed.classList.remove('armed');armed.textContent=armed.dataset.lbl;armed=null}
  if(a==='tab'){ui.tab=b.dataset.v;saveUi();try{history.replaceState(null,'','#'+ui.tab)}catch(_){}render();window.scrollTo(0,0)}
  else if(a==='mes'){ui.mes=shiftMonth(ui.mes,+b.dataset.d);render()}
  else if(a==='gmes'){ui.gMes=shiftMonth(ui.gMes||today().slice(0,7),+b.dataset.d);render()}
  else if(a==='gall'){ui.gMes=ui.gMes?'':today().slice(0,7);render()}
  else if(a==='toggle'){ui.open[b.dataset.id]=!ui.open[b.dataset.id];render()}
  else if(a==='new'||a==='edit'){const k=b.dataset.kind,id=a==='edit'?b.dataset.id:null;({insumo:formInsumo,produto:formProduto,gasto:formGasto,pedido:formPedido,producao:()=>formProducao(),tarefa:formTarefa})[k](id)}
  else if(a==='toggleTask'){const t=S.tarefas.find(x=>x.id===b.dataset.id);if(t){try{await save('tarefas',t.id,{...t,feito:!t.feito,feitoEm:t.feito?'':new Date().toISOString()});toast(t.feito?'Tarefa reaberta':'Tarefa concluída')}catch(_){toast('Não foi possível salvar.')}}}
  else if(a==='limparFeitas'){
    if(armed!==b){b.dataset.lbl=b.textContent;b.textContent='Confirmar: apagar concluídas';b.classList.add('armed');armed=b;return}
    armed=null;let n=0;for(const t of S.tarefas.filter(t=>t.feito)){try{await remove('tarefas',t.id);n++}catch(_){}}toast(n+' tarefas apagadas')}
  else if(a==='comprar'){const i=insById(b.dataset.id);formGasto(null,{insumoId:i.id,descricao:i.nome,loja:i.fornecedor||'',categoria:i.categoria==='Embalagem'?'Embalagem':'Insumo'})}
  else if(a==='produzir'){formProducao(b.dataset.id)}
  else if(a==='close'){closeDrawer()}
  else if(a==='addIns'){$('#rowsIns').insertAdjacentHTML('beforeend',rowIns({qtd:1,rende:1}));updCalc()}
  else if(a==='addPed'){$('#rowsPed').insertAdjacentHTML('beforeend',rowPed());updPed()}
  else if(a==='rmrow'){b.closest('.lrow').remove();updCalc();updPed()}
  else if(a==='del'){
    if(armed!==b){if(armed){armed.classList.remove('armed');armed.textContent=armed.dataset.lbl}b.dataset.lbl=b.textContent;b.textContent='Confirmar exclusão';b.classList.add('armed');armed=b;return}
    armed=null;try{await remove(b.dataset.col,b.dataset.id);if(drawer)closeDrawer();toast('Excluído')}catch(_){toast('Não foi possível excluir.')}
  }
  else if(a==='limparEx'){
    if(armed!==b){b.dataset.lbl=b.textContent;b.textContent='Confirmar: apagar exemplos';b.classList.add('armed');armed=b;return}
    armed=null;try{const n=await removeExemplos();toast(n+' exemplos apagados')}catch(_){toast('Não foi possível apagar os exemplos.')}
  }
  else if(a==='exemplos'){b.disabled=true;try{const n=await carregarExemplos();toast(n+' registros de exemplo carregados')}catch(_){toast('Não foi possível carregar os exemplos.')}finally{b.disabled=false}}
  else if(a==='backup'){const blob=new Blob([JSON.stringify(backupObj(),null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download='lojinha-backup-'+today()+'.json';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
  else if(a==='logout'){await sb.auth.signOut()}
});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.dataset.act==='status'){const o=S.pedidos.find(x=>x.id===t.dataset.id);if(o){try{await save('pedidos',o.id,{...o,status:t.value});toast('Status: '+STATUS[t.value][0])}catch(_){toast('Não foi possível salvar.')}}return}
  if(t.dataset.bind){ui[t.dataset.bind]=t.type==='checkbox'?t.checked:t.value;if(t.dataset.bind==='mes'&&!t.value)ui.mes=today().slice(0,7);saveUi();render();return}
  if(t.id==='f-img'){pickImage(t.files[0]);return}
  if(t.id==='f-restore'&&t.files[0]){let recs=[];try{recs=recordsFrom(JSON.parse(await t.files[0].text()))}catch(_){}t.value='';if(!recs.length){toast('Esse arquivo não parece um backup do painel.');return}try{await saveMany(recs);toast(recs.length+' registros restaurados')}catch(_){toast('Não foi possível restaurar o backup.')}return}
  if(drawer&&drawer.contains(t)){
    if(drawer.dataset.kind==='pedido'&&t.dataset.f==='produtoId'){const p=prodById(t.value),pr=t.closest('.lrow').querySelector('[data-f=preco]');if(p&&!pr.value)pr.value=custo(p).preco.toFixed(2)}
    updCalc();updPed();updProd();
  }
});
document.addEventListener('input',e=>{if(drawer&&drawer.contains(e.target)){updCalc();updPed();updProd()}});
document.addEventListener('submit',e=>{
  e.preventDefault();
  if(e.target.id==='dForm')submitDrawer();
  if(e.target.id==='taskQuick'){const ti=$('#tq-titulo').value.trim();if(!ti)return;save('tarefas',newId(),{titulo:ti,prazo:$('#tq-prazo').value,prioridade:$('#tq-pri').value,etiqueta:ui.tTag||'',notas:'',feito:false,criadoEm:new Date().toISOString()}).then(()=>{toast('Tarefa adicionada');const i=$('#tq-titulo');if(i){i.value='';i.focus()}}).catch(()=>toast('Não foi possível salvar.'))}
  if(e.target.id==='cfgForm'){const fd=Object.fromEntries(new FormData(e.target));saveConfig({...S.config,...fd}).then(()=>toast('Ajustes salvos')).catch(()=>toast('Não foi possível salvar.'))}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer)closeDrawer()});
const tip=$('#tip');
document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.hidden=true;return}tip.innerHTML=t.dataset.tip;tip.hidden=false});
document.addEventListener('mousemove',e=>{if(!tip.hidden){const x=Math.min(e.clientX+14,innerWidth-tip.offsetWidth-8);tip.style.left=x+'px';tip.style.top=(e.clientY+14)+'px'}});
let tt=0;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2400)}

boot();
