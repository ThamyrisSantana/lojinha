/* TanStack Query hooks: the only way screens read and change data.
   The whole Db is one query (it is small and every screen needs most of it). Changes are
   optimistic: the screen updates at once and rolls back with a message if saving fails. */
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUserId } from '@/auth/AuthProvider';
import { toast } from '@/components/ui/toast';
import { createCalc } from '@/domain/calc';
import type { Collection, Db, RecordOf } from '@/domain/types';
import { saveErrorMessage } from '@/lib/errors';
import { applyRecords, cleanData, removeIds, sampleRecords, withoutSamples, type StoredRecord } from './backup';
import { cloudRepository, demoRepository, type Repository } from './repository';

const demo = demoRepository();
const repositories = new Map<string, Repository>();
function repositoryFor(userId: string | null): Repository {
  if (!userId) return demo;
  if (!repositories.has(userId)) repositories.set(userId, cloudRepository(userId));
  return repositories.get(userId)!;
}

const dbKey = (userId: string | null) => ['db', userId ?? 'demo'] as const;

function useRepository() {
  const userId = useUserId();
  return { userId, repo: repositoryFor(userId), key: dbKey(userId) };
}

/** All the data. Suspends while loading (the app shows a loading state meanwhile). */
export function useDb(): Db {
  const { repo, key } = useRepository();
  return useSuspenseQuery({ queryKey: key, queryFn: () => repo.load(), staleTime: Infinity }).data;
}

/** The calculations for the current data, cached until the data changes. */
export function useCalc() {
  const db = useDb();
  return useMemo(() => createCalc(db), [db]);
}

/** Runs a change on the server while showing its result immediately (rolled back on failure). */
function useOptimistic<T>(apply: (db: Db, input: T) => Db, run: (repo: Repository, input: T) => Promise<void>) {
  const qc = useQueryClient();
  const { repo, key } = useRepository();
  return useMutation({
    mutationFn: (input: T) => run(repo, input),
    onMutate: async input => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Db>(key);
      if (previous) qc.setQueryData(key, apply(previous, input));
      return { previous };
    },
    onError: (error, _input, context) => {
      console.error(error);
      if (context?.previous) qc.setQueryData(key, context.previous);
      // Another change may have been saved meanwhile: reload what is really stored.
      void qc.invalidateQueries({ queryKey: key });
      toast(saveErrorMessage(error), { duration: 6000 });
    },
  });
}

type Saveable = { colecao: Collection; record: { id: string } } | { colecao: 'config'; record: Db['config'] };
const toStored = (items: Saveable[]): StoredRecord[] =>
  items.map(i =>
    i.colecao === 'config'
      ? { colecao: 'config', id: 'geral', dados: { ...i.record } }
      : { colecao: i.colecao, id: i.record.id, dados: cleanData(i.record) },
  );

/** Saves (inserts or replaces) one or more records. */
export function useSave() {
  const m = useOptimistic<StoredRecord[]>(applyRecords, (repo, recs) => repo.save(recs));
  return {
    ...m,
    /** save('pedidos', pedido) */
    save: <C extends Collection>(colecao: C, record: RecordOf<C>) => m.mutateAsync(toStored([{ colecao, record }])),
    /** saveMany('tarefas', [t1, t2]): several records of one collection in a single save. */
    saveMany: <C extends Collection>(colecao: C, records: RecordOf<C>[]) =>
      m.mutateAsync(toStored(records.map(record => ({ colecao, record })))),
    saveConfig: (config: Db['config']) => m.mutateAsync(toStored([{ colecao: 'config', record: config }])),
    saveRecords: (recs: StoredRecord[]) => m.mutateAsync(recs),
  };
}

export function useRemove() {
  const m = useOptimistic<{ colecao: Collection; ids: string[] }>(
    (db, { colecao, ids }) => removeIds(db, colecao, ids),
    (repo, { colecao, ids }) => repo.remove(colecao, ids),
  );
  return { ...m, remove: (colecao: Collection, ...ids: string[]) => m.mutateAsync({ colecao, ids }) };
}

/** Loads the sample data (keeps the user's settings if there are any). */
export function useLoadSamples() {
  const db = useDb();
  const { saveRecords, isPending } = useSave();
  const load = async () => {
    const recs = (await sampleRecords()).filter(r => r.colecao !== 'config' || !Object.keys(db.config).length);
    await saveRecords(recs);
    toast(recs.length + ' registros de exemplo carregados');
  };
  return { load: () => load().catch(() => {}), isPending };
}

export function useRemoveSamples() {
  return useOptimistic<void>(withoutSamples, repo => repo.removeSamples());
}
