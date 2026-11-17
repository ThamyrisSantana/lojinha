import { useRef } from 'react';
import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { THEME_OPTIONS } from '@/app/Shell';
import { useTheme } from '@/app/useTheme';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ConfirmButton } from '@/components/ui/Button';
import { FieldGrid, TextField } from '@/components/ui/Field';
import { PageHeader, Sub } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { toast } from '@/components/ui/toast';
import { COLLECTIONS } from '@/domain/types';
import { backupObj, recordsFrom } from '@/data/backup';
import { useCalc, useLoadSamples, useRemoveSamples, useSave } from '@/data/queries';
import { isDemoMode } from '@/data/supabase';
import { decimal, stringValues, text, useZodForm } from '@/features/forms/formKit';
import { today } from '@/lib/dates';

const schema = z.object({ nomeLoja: text(), valorHora: decimal(), margem: decimal(), taxa: decimal(), perda: decimal() });
const card = 'flex max-w-form flex-col gap-3 rounded-md border border-border bg-surface p-6 shadow-sm';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Ajustes" description="Os valores padrão usados na precificação. Cada produto pode sobrescrever margem e taxa." />
      <DefaultsForm />
      <Appearance />
      <DataSection />
    </>
  );
}

function DefaultsForm() {
  const calc = useCalc();
  const { saveConfig, isPending } = useSave();
  const form = useZodForm(schema, stringValues(calc.cfg(), ['nomeLoja', 'valorHora', 'margem', 'taxa', 'perda']));
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={card + ' gap-4'}
        onSubmit={form.handleSubmit(async v => {
          try {
            await saveConfig({ ...calc.db.config, ...v });
            toast('Ajustes salvos');
          } catch {
            /* already reported */
          }
        })}
      >
        <FieldGrid>
          <TextField name="nomeLoja" label="Nome da loja" full />
          <TextField name="valorHora" label="Seu valor-hora (R$)" decimal help="Quanto você quer ganhar por hora de trabalho." />
          <TextField name="margem" label="Margem de lucro padrão (%)" decimal help="Somada sobre o custo total." />
          <TextField name="taxa" label="Taxa de venda padrão (%)" decimal help="Comissão da plataforma + meio de pagamento." />
          <TextField name="perda" label="Perda / desperdício (%)" decimal help="Impressões erradas, cortes, testes." />
        </FieldGrid>
        <div>
          <Button type="submit" variant="primary" disabled={isPending}>
            Salvar ajustes
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function Appearance() {
  const { choice, isDark, setTheme } = useTheme();
  return (
    <section className={card}>
      <h2 className="text-lg/snug font-bold tracking-tight">Aparência</h2>
      <Segmented
        label="Tema"
        size="lg"
        options={THEME_OPTIONS(false)}
        value={choice}
        onChange={setTheme}
        className="min-w-[min(420px,100%)] self-start"
      />
      <Sub>
        {choice === 'auto'
          ? `Automático: segue o tema do seu celular ou computador (agora está ${isDark ? 'escuro' : 'claro'}).`
          : `Tema ${choice === 'dark' ? 'escuro' : 'claro'} fixo neste navegador.`}{' '}
        A escolha vale só para este aparelho.
      </Sub>
    </section>
  );
}

function DataSection() {
  const calc = useCalc();
  const auth = useAuth();
  const { saveRecords } = useSave();
  const removeSamples = useRemoveSamples();
  const fileInput = useRef<HTMLInputElement>(null);
  const samplesLoader = useLoadSamples();
  const db = calc.db;
  const samples = COLLECTIONS.reduce((a, c) => a + (db[c] as { exemplo?: boolean }[]).filter(r => r.exemplo).length, 0);

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(backupObj(db), null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `lojinha-backup-${today()}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const restore = async (file: File) => {
    let recs: ReturnType<typeof recordsFrom> = [];
    try {
      recs = recordsFrom(JSON.parse(await file.text()));
    } catch {
      /* not JSON: handled below */
    }
    if (!recs.length) return toast('Esse arquivo não parece um backup do painel.');
    try {
      await saveRecords(recs);
      toast(recs.length + ' registros restaurados');
    } catch {
      /* already reported */
    }
  };

  return (
    <section className={card}>
      <h2 className="text-lg/snug font-bold tracking-tight">Dados</h2>
      <Sub>
        {isDemoMode ? (
          'Modo demonstração: os dados ficam só neste navegador. Configure as chaves do Supabase para salvar na nuvem. '
        ) : (
          <>
            Conta: <b>{auth.status === 'signedIn' ? auth.user.email : ''}</b>. Os dados ficam no Supabase e aparecem em qualquer aparelho em
            que você entrar.{' '}
          </>
        )}
        {db.produtos.length} produtos · {db.insumos.length} insumos · {db.gastos.length} gastos · {db.pedidos.length} pedidos ·{' '}
        {db.producoes.length} lotes.
      </Sub>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={download}>Baixar backup (JSON)</Button>
        <Button onClick={() => fileInput.current?.click()}>Restaurar backup…</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void restore(file);
          }}
        />
        {samples ? (
          <ConfirmButton
            outlined
            confirmLabel="Confirmar: apagar exemplos"
            onConfirm={() =>
              removeSamples.mutateAsync().then(
                () => toast(samples + ' exemplos apagados'),
                () => {},
              )
            }
          >
            Apagar {samples} registros de exemplo
          </ConfirmButton>
        ) : (
          <Button onClick={samplesLoader.load} disabled={samplesLoader.isPending}>
            Carregar dados de exemplo
          </Button>
        )}
      </div>
      <Sub>Restaurar um backup adiciona os registros dele e substitui os que tiverem o mesmo código; nada é apagado.</Sub>
    </section>
  );
}
