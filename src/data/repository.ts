/* Where the data lives. Two implementations with the same interface:
   - cloud: every record is a row of the Supabase `registros` table (one per user);
   - demo: the whole Db is kept in this browser's localStorage.
   Screens never talk to these directly; they use the query hooks in queries.ts. */
import { emptyDb, type Collection, type Db } from '@/domain/types';
import { nowISO } from '@/lib/dates';
import { applyRecords, removeIds, sampleRecords, withoutSamples, type StoredRecord } from './backup';
import { supabase, TABLE } from './supabase';

export interface Repository {
  load(): Promise<Db>;
  save(recs: StoredRecord[]): Promise<void>;
  remove(colecao: Collection, ids: string[]): Promise<void>;
  removeSamples(): Promise<void>;
}

/* ---------- demo (browser only) ---------- */
const DEMO_KEY = 'painel-lojinha-demo';

function readDemo(): Db | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? { ...emptyDb(), ...(JSON.parse(raw) as Partial<Db>) } : null;
  } catch {
    return null;
  }
}
function writeDemo(db: Db) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: changes last until the page is closed */
  }
}

export function demoRepository(): Repository {
  let db: Db | null = null;
  const current = async () => (db ??= readDemo() ?? applyRecords(emptyDb(), await sampleRecords()));
  const commit = (next: Db) => {
    db = next;
    writeDemo(next);
  };
  return {
    async load() {
      const d = await current();
      writeDemo(d);
      return d;
    },
    async save(recs) {
      commit(applyRecords(await current(), recs));
    },
    async remove(colecao, ids) {
      commit(removeIds(await current(), colecao, ids));
    },
    async removeSamples() {
      commit(withoutSamples(await current()));
    },
  };
}

/* ---------- cloud (Supabase) ---------- */
export function cloudRepository(userId: string): Repository {
  const sb = supabase!;
  const check = ({ error }: { error: unknown }) => {
    if (error) throw error;
  };
  return {
    async load() {
      const rows: StoredRecord[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb
          .from(TABLE)
          .select('colecao,id,dados')
          .eq('user_id', userId)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data as StoredRecord[]));
        if (data.length < PAGE) break;
      }
      return applyRecords(emptyDb(), rows);
    },
    async save(recs) {
      const now = nowISO();
      for (let i = 0; i < recs.length; i += 200) {
        const batch = recs.slice(i, i + 200).map(r => ({ user_id: userId, ...r, atualizado_em: now }));
        check(await sb.from(TABLE).upsert(batch));
      }
    },
    async remove(colecao, ids) {
      check(await sb.from(TABLE).delete().eq('user_id', userId).eq('colecao', colecao).in('id', ids));
    },
    async removeSamples() {
      check(await sb.from(TABLE).delete().eq('user_id', userId).eq('dados->>exemplo', 'true'));
    },
  };
}
