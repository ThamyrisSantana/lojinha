-- Painel da Lojinha: estrutura do banco no Supabase.
-- Cole tudo no SQL Editor do seu projeto (SQL Editor → New query) e clique em Run.
-- Pode rodar de novo sem problema: os comandos não duplicam nada.

-- Todos os cadastros ficam numa tabela só. "colecao" diz o tipo
-- (insumos, produtos, gastos, pedidos, producoes, config) e "dados" guarda os campos.
create table if not exists public.registros (
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  colecao       text        not null check (colecao in ('insumos','produtos','gastos','pedidos','producoes','config')),
  id            text        not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, colecao, id)
);

-- Cada conta só enxerga e altera os próprios registros.
alter table public.registros enable row level security;

drop policy if exists "dono le"      on public.registros;
drop policy if exists "dono cria"    on public.registros;
drop policy if exists "dono altera"  on public.registros;
drop policy if exists "dono apaga"   on public.registros;

create policy "dono le"     on public.registros for select to authenticated using (user_id = auth.uid());
create policy "dono cria"   on public.registros for insert to authenticated with check (user_id = auth.uid());
create policy "dono altera" on public.registros for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dono apaga"  on public.registros for delete to authenticated using (user_id = auth.uid());

-- Imagens das artes. O bucket é público para leitura (as imagens aparecem pelo link),
-- mas cada conta só envia ou apaga dentro da pasta com o próprio id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 10485760, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagens envia" on storage.objects;
drop policy if exists "imagens altera" on storage.objects;
drop policy if exists "imagens apaga" on storage.objects;

create policy "imagens envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "imagens altera" on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "imagens apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);
