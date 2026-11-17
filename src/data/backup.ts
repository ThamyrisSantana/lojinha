/* Backup format (same as exemplo.json): {versao, config, insumos: {id: dados}, ...}. */
import { COLLECTIONS, type Collection, type Db } from '@/domain/types';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** One stored record: its collection, id and fields (without the id). */
export interface StoredRecord {
  colecao: Collection | 'config';
  id: string;
  dados: Record<string, unknown>;
}

/** A deep copy of a record without its id (the id is a separate column). */
export function cleanData<T extends object>(d: T): Record<string, unknown> {
  const c = structuredClone(d) as Record<string, unknown>;
  delete c.id;
  return c;
}

export function backupObj(db: Db) {
  const out: Record<string, unknown> = { versao: 1, config: db.config };
  for (const c of COLLECTIONS) out[c] = Object.fromEntries(db[c].map(r => [r.id, cleanData(r)]));
  return out;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Turns a backup object into records, skipping anything that doesn't look like one. */
export function recordsFrom(obj: unknown): StoredRecord[] {
  if (!isObject(obj)) return [];
  const recs: StoredRecord[] = [];
  if (isObject(obj.config)) recs.push({ colecao: 'config', id: 'geral', dados: obj.config });
  for (const c of COLLECTIONS) {
    const group = obj[c];
    if (!isObject(group)) continue;
    for (const [id, d] of Object.entries(group)) if (ID_PATTERN.test(id) && isObject(d)) recs.push({ colecao: c, id, dados: d });
  }
  return recs;
}

/** Applies records to a Db (immutably): inserts new ones, replaces those with the same id. */
export function applyRecords(db: Db, recs: StoredRecord[]): Db {
  const next: Db = { ...db };
  for (const r of recs) {
    if (r.colecao === 'config') {
      next.config = r.dados;
      continue;
    }
    const row = { id: r.id, ...r.dados };
    const list = next[r.colecao] as { id: string }[];
    const i = list.findIndex(x => x.id === r.id);
    (next[r.colecao] as { id: string }[]) = i >= 0 ? list.with(i, row) : [...list, row];
  }
  return next;
}

/** The Db without the records of collection `colecao` whose id is in `ids`. */
export function removeIds(db: Db, colecao: Collection, ids: string[]): Db {
  const drop = new Set(ids);
  return { ...db, [colecao]: (db[colecao] as { id: string }[]).filter(r => !drop.has(r.id)) };
}

/** The Db without sample records (exemplo.json). */
export function withoutSamples(db: Db): Db {
  const next = { ...db };
  for (const c of COLLECTIONS) (next[c] as { exemplo?: boolean }[]) = (db[c] as { exemplo?: boolean }[]).filter(r => !r.exemplo);
  return next;
}

/** Loads the bundled sample data (only downloaded when asked for). */
export async function sampleRecords(): Promise<StoredRecord[]> {
  const sample = await import('./exemplo.json');
  return recordsFrom(sample.default);
}
