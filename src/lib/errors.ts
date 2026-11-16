/** Explains why saving failed instead of a generic message. */
export function saveErrorMessage(e: unknown): string {
  const err = (e ?? {}) as { code?: string; message?: string };
  const code = err.code;
  const msg = String(err.message || '');
  if (code === '23514' || msg.includes('registros_colecao_check'))
    return 'O banco ainda não aceita esse tipo de registro. Rode de novo o supabase/schema.sql no Supabase.';
  if (code === '42501' || code === 'PGRST301' || /jwt/i.test(msg)) return 'Sua sessão expirou ou não tem permissão. Saia e entre de novo.';
  if (code === 'quota_exceeded') return 'O armazenamento do painel está cheio.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  return 'Não foi possível salvar' + (msg ? ': ' + msg : '.');
}

/** Record ids: short, sortable by creation time and valid for the database (letters, digits, - and _). */
export const newId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
