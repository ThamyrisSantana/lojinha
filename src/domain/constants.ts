/* Domain constants: option lists shown in the forms and the status/priority tables. */
import type { OrderStatus, Pedido, Priority, Tarefa } from './types';

export const UNIDADES = ['un', 'folha', 'm', 'cm', 'g', 'ml', 'rolo', 'pacote'];
export const CAT_INS = ['Papel', 'Botton', 'Chaveiro', 'Embalagem', 'Tinta', 'Encadernação', 'Adesivo', 'Outros'];
export const CAT_PROD = ['Botton', 'Print', 'Marcador', 'Bloco de notas', 'Chaveiro', 'Adesivo', 'Cartão', 'Outros'];
export const CAT_GASTO = ['Insumo', 'Embalagem', 'Equipamento', 'Frete', 'Taxas e assinaturas', 'Marketing', 'Outros'];
export const CANAIS = ['Instagram', 'Shopee', 'Elo7', 'Site próprio', 'WhatsApp', 'Feira / evento', 'Mercado Livre', 'Etsy'];
export const QUALIDADES = ['Rascunho', 'Normal', 'Alta', 'Foto / máxima'];
export const ETIQUETAS = ['Produção', 'Pedidos', 'Criação', 'Divulgação', 'Compras', 'Administrativo'];
export const PAPEIS = [
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

/** Visual tone of a chip or alert. */
export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'strong' | 'neutral';

export const STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  novo: { label: 'Novo', tone: 'strong' },
  produzindo: { label: 'Produzindo', tone: 'warn' },
  enviado: { label: 'Enviado', tone: 'info' },
  entregue: { label: 'Entregue', tone: 'good' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};
export const STATUS_OPTIONS = Object.entries(STATUS).map(([value, s]) => ({ value: value as OrderStatus, label: s.label }));

/** Orders still waiting for work (nav badge and "Precisa de atenção"). */
export const isPending = (o: Pedido): boolean => o.status === 'novo' || o.status === 'produzindo';
/** Orders not finished yet (the "Em andamento" filter also includes shipped ones). */
export const isInProgress = (o: Pedido): boolean => isPending(o) || o.status === 'enviado';
/** Orders that count as sales. */
export const isCounted = (o: Pedido): boolean => o.status !== 'cancelado';

export const PRIORIDADES: Record<Priority, { label: string; tone: Tone; weight: number }> = {
  alta: { label: 'Alta', tone: 'bad', weight: 3 },
  media: { label: 'Média', tone: 'warn', weight: 2 },
  baixa: { label: 'Baixa', tone: 'neutral', weight: 1 },
};
export const PRIORITY_OPTIONS = Object.entries(PRIORIDADES).map(([value, p]) => ({ value: value as Priority, label: p.label }));
export const priorityOf = (t: Tarefa) => PRIORIDADES[t.prioridade ?? 'media'] ?? PRIORIDADES.media;
