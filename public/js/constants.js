/* Domain constants: option lists shown in the forms and the status/priority tables. */

const UNIDADES = ['un', 'folha', 'm', 'cm', 'g', 'ml', 'rolo', 'pacote'];
const CAT_INS = ['Papel', 'Botton', 'Chaveiro', 'Embalagem', 'Tinta', 'Encadernação', 'Adesivo', 'Outros'];
const CAT_PROD = ['Botton', 'Print', 'Marcador', 'Bloco de notas', 'Chaveiro', 'Adesivo', 'Cartão', 'Outros'];
const CAT_GASTO = ['Insumo', 'Embalagem', 'Equipamento', 'Frete', 'Taxas e assinaturas', 'Marketing', 'Outros'];
const CANAIS = ['Instagram', 'Shopee', 'Elo7', 'Site próprio', 'WhatsApp', 'Feira / evento', 'Mercado Livre', 'Etsy'];
const QUALIDADES = ['Rascunho', 'Normal', 'Alta', 'Foto / máxima'];
const ETIQUETAS = ['Produção', 'Pedidos', 'Criação', 'Divulgação', 'Compras', 'Administrativo'];
const PAPEIS = [
  'Couché fosco 250g',
  'Couché brilho 250g',
  'Fotográfico glossy 180g',
  'Fotográfico matte 230g',
  'Offset 180g',
  'Canson 300g',
  'Kraft 240g',
  'Adesivo vinil',
  'Adesivo papel',
];

/** Order status: key → [label, chip tone]. */
const STATUS = {
  novo: ['Novo', 'pink'],
  produzindo: ['Produzindo', 'warn'],
  enviado: ['Enviado', 'blue'],
  entregue: ['Entregue', 'good'],
  cancelado: ['Cancelado', ''],
};
/** Orders still waiting for work (shown in the nav badge and in "Precisa de atenção"). */
const isPending = o => o.status === 'novo' || o.status === 'produzindo';
/** Orders not finished yet (the "Em andamento" filter also includes shipped ones). */
const isInProgress = o => isPending(o) || o.status === 'enviado';
const isCounted = o => o.status !== 'cancelado';

/** Task priority: key → [label, chip tone, sort weight]. */
const PRIORIDADES = { alta: ['Alta', 'bad', 3], media: ['Média', 'warn', 2], baixa: ['Baixa', '', 1] };
const priorityOf = t => PRIORIDADES[t.prioridade] || PRIORIDADES.media;

/** [value, label] pairs for <select>s built from the tables above. */
const STATUS_OPTIONS = Object.entries(STATUS).map(([k, [label]]) => [k, label]);
const PRIORITY_OPTIONS = Object.entries(PRIORIDADES).map(([k, [label]]) => [k, label]);
