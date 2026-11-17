/* Data model. Records are stored exactly as the forms produce them, so numeric fields are
   usually strings typed by the user ("1,5"); read them with num(). Keeping this format means
   data saved by older versions of the app keeps working. */

/** A number typed in a form ("1,5", "") or computed by the app (1.5). */
export type NumLike = string | number | null | undefined;

interface BaseRecord {
  id: string;
  /** Sample record (exemplo.json); removable all at once in Ajustes. */
  exemplo?: boolean;
  criadoEm?: string;
}

export interface Insumo extends BaseRecord {
  nome: string;
  categoria?: string;
  unidade?: string;
  custoManual?: NumLike;
  estoqueInicial?: NumLike;
  estoqueMin?: NumLike;
  fornecedor?: string;
  obs?: string;
}

/** One line of a product's recipe: `qtd` of a supply makes `rende` pieces. */
export interface RecipeLine {
  insumoId: string;
  qtd: NumLike;
  rende: NumLike;
}

export interface Produto extends BaseRecord {
  nome: string;
  categoria?: string;
  sku?: string;
  imagem?: string;
  insumos?: RecipeLine[];
  tempoMin?: NumLike;
  custoExtra?: NumLike;
  margem?: NumLike;
  taxa?: NumLike;
  preco?: NumLike;
  estoqueInicial?: NumLike;
  qtdImprimir?: NumLike;
  tamanho?: string;
  pecasFolha?: NumLike;
  papel?: string;
  qualidade?: string;
  densidade?: string;
  impressora?: string;
  brilho?: NumLike;
  contraste?: NumLike;
  saturacao?: NumLike;
  obsImpressao?: string;
}

export interface Gasto extends BaseRecord {
  data: string;
  descricao: string;
  categoria?: string;
  loja?: string;
  nf?: string;
  valor?: NumLike;
  frete?: NumLike;
  /** When the expense bought a supply, it adds `qtd` to that supply's stock. */
  insumoId?: string;
  qtd?: NumLike;
}

export type OrderStatus = 'novo' | 'produzindo' | 'enviado' | 'entregue' | 'cancelado';

export interface OrderItem {
  produtoId: string;
  qtd: NumLike;
  preco: NumLike;
}

export interface Pedido extends BaseRecord {
  data: string;
  numero?: string;
  canal?: string;
  cliente?: string;
  status: OrderStatus;
  nf?: string;
  itens?: OrderItem[];
  freteCobrado?: NumLike;
  desconto?: NumLike;
  taxaValor?: NumLike;
  custoEnvio?: NumLike;
  rastreio?: string;
  obs?: string;
}

export interface Consumo {
  insumoId: string;
  qtd: number;
}

export interface Producao extends BaseRecord {
  data: string;
  produtoId: string;
  qtd: number;
  obs?: string;
  /** Supplies this batch used, fixed when it was registered. */
  consumo?: Consumo[];
}

export type Priority = 'alta' | 'media' | 'baixa';

export interface Tarefa extends BaseRecord {
  titulo: string;
  prazo?: string;
  prioridade?: Priority;
  etiqueta?: string;
  notas?: string;
  feito?: boolean;
  feitoEm?: string;
  /** Position the user chose by dragging (1, 2, 3…), within its due-date group. Tasks never moved have none. */
  ordem?: number;
}

export interface Config {
  nomeLoja?: string;
  valorHora?: NumLike;
  margem?: NumLike;
  taxa?: NumLike;
  perda?: NumLike;
}

/** Everything the dashboard shows, loaded at once. */
export interface Db {
  insumos: Insumo[];
  produtos: Produto[];
  gastos: Gasto[];
  pedidos: Pedido[];
  producoes: Producao[];
  tarefas: Tarefa[];
  config: Config;
}

export type Collection = Exclude<keyof Db, 'config'>;
export const COLLECTIONS: Collection[] = ['insumos', 'produtos', 'gastos', 'pedidos', 'producoes', 'tarefas'];

export type RecordOf<C extends Collection> = Db[C][number];

export const emptyDb = (): Db => ({
  insumos: [],
  produtos: [],
  gastos: [],
  pedidos: [],
  producoes: [],
  tarefas: [],
  config: {},
});
