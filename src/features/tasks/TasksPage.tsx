import { getRouteApi } from '@tanstack/react-router';
import { useRef, type ReactNode } from 'react';
import { Button, ConfirmButton } from '@/components/ui/Button';
import { Chip, Count, SampleChip } from '@/components/ui/Chip';
import { controlClass } from '@/components/ui/Field';
import { EmptyState, PageHeader } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { toast } from '@/components/ui/toast';
import { taskOrder } from '@/domain/calc';
import { ETIQUETAS, PRIORITY_OPTIONS, priorityOf } from '@/domain/constants';
import type { Priority, Tarefa } from '@/domain/types';
import { useCalc, useRemove, useSave } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { cn } from '@/lib/cn';
import { addDays, dataBR, nowISO, prazoLabel, today } from '@/lib/dates';
import { newId } from '@/lib/errors';
import { plural } from '@/lib/format';

const route = getRouteApi('/tarefas');
type Filter = 'pendentes' | 'feitas' | 'todas';

export default function TasksPage() {
  const calc = useCalc();
  const { remove } = useRemove();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const filter: Filter = search.filtro ?? 'pendentes';
  const tag = search.etiqueta ?? '';

  const h = today();
  const in7 = addDays(h, 7);
  const tasks = tag ? calc.db.tarefas.filter(t => t.etiqueta === tag) : calc.db.tarefas;
  const pending = tasks.filter(t => !t.feito);
  const done = tasks.filter(t => t.feito).toSorted((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || ''));
  const urgent = calc.tarefasUrgentes().length;
  const tags = [...new Set([...ETIQUETAS, ...calc.db.tarefas.map(t => t.etiqueta).filter((e): e is string => !!e)])];

  const groups: [string, (t: Tarefa) => boolean, boolean?][] = [
    ['Atrasadas', t => !!t.prazo && t.prazo < h, true],
    ['Hoje', t => t.prazo === h],
    ['Próximos 7 dias', t => !!t.prazo && t.prazo > h && t.prazo <= in7],
    ['Mais para frente', t => !!t.prazo && t.prazo > in7],
    ['Sem prazo', t => !t.prazo],
  ];
  const pendingGroups = groups.map(([title, test, late]) => (
    <TaskGroup key={title} title={title} late={late} tasks={pending.filter(test).toSorted(taskOrder)} />
  ));
  const doneGroup = (
    <TaskGroup
      title="Concluídas"
      tasks={done}
      action={
        <ConfirmButton
          size="sm"
          className="ml-auto"
          confirmLabel="Confirmar: apagar concluídas"
          onConfirm={async () => {
            try {
              await remove('tarefas', ...calc.db.tarefas.filter(t => t.feito).map(t => t.id));
              toast(`${done.length} ${plural(done.length, 'tarefa apagada', 'tarefas apagadas')}`);
            } catch {
              /* already reported */
            }
          }}
        >
          Apagar concluídas
        </ConfirmButton>
      }
    />
  );
  const showPending = filter !== 'feitas' && pending.length > 0;
  const showDone = filter !== 'pendentes' && done.length > 0;

  return (
    <>
      <PageHeader
        title={
          <>
            Lista de <em>tarefas</em>
          </>
        }
        description={`${pending.length} ${plural(pending.length, 'pendente')}${urgent ? ` · ${urgent} para hoje ou ${plural(urgent, 'atrasada')}` : ''}. Marque a caixinha para concluir.`}
        actions={
          <>
            <Segmented<Filter>
              label="Mostrar"
              value={filter}
              onChange={v => navigate({ search: s => ({ ...s, filtro: v === 'pendentes' ? undefined : v }) })}
              options={[
                { value: 'pendentes', label: 'Pendentes' },
                { value: 'feitas', label: 'Concluídas' },
                { value: 'todas', label: 'Todas' },
              ]}
            />
            <select
              aria-label="Etiqueta"
              className={cn(controlClass, 'w-auto rounded-full px-3.5 py-2')}
              value={tag}
              onChange={e => navigate({ search: s => ({ ...s, etiqueta: e.target.value || undefined }) })}
            >
              <option value="">Todas as etiquetas</option>
              {tags.map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </>
        }
      />
      <QuickAdd tag={tag} />
      {showPending && pendingGroups}
      {showDone && doneGroup}
      {!showPending &&
        !showDone &&
        (calc.db.tarefas.length ? (
          <EmptyState title={filter === 'feitas' ? 'Nenhuma tarefa concluída' : 'Nada pendente por aqui'}>
            Use o campo acima para adicionar uma tarefa.
          </EmptyState>
        ) : (
          <EmptyState title="Nenhuma tarefa ainda">
            Anote o que precisa fazer: imprimir um lote, responder um cliente, comprar papel, postar no Instagram.
          </EmptyState>
        ))}
    </>
  );
}

/** One-line form to add a task without opening the drawer. */
function QuickAdd({ tag }: { tag: string }) {
  const { save } = useSave();
  const title = useRef<HTMLInputElement>(null);
  const field = cn(controlClass, 'w-auto rounded-full border-transparent bg-surface-muted');
  return (
    <form
      autoComplete="off"
      className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 rounded-full border border-border bg-surface p-2 shadow-sm max-md:grid-cols-2 max-md:rounded-md"
      onSubmit={async e => {
        e.preventDefault();
        const f = e.currentTarget;
        const data = new FormData(f);
        const titulo = String(data.get('titulo') || '').trim();
        if (!titulo) {
          toast('Escreva a tarefa antes de adicionar.');
          title.current?.focus();
          return;
        }
        try {
          await save('tarefas', {
            id: newId(),
            titulo,
            prazo: String(data.get('prazo') || ''),
            prioridade: String(data.get('prioridade')) as Priority,
            etiqueta: tag,
            notas: '',
            feito: false,
            criadoEm: nowISO(),
          });
          toast('Tarefa adicionada');
          f.reset();
          title.current?.focus();
        } catch {
          /* already reported */
        }
      }}
    >
      <input
        ref={title}
        name="titulo"
        aria-label="Nova tarefa"
        maxLength={200}
        placeholder="Nova tarefa… ex.: imprimir bottons do pedido 1042"
        className={cn(field, 'w-full pl-3.5 max-md:col-span-full')}
      />
      <input name="prazo" type="date" aria-label="Prazo" className={field} />
      <select name="prioridade" aria-label="Prioridade" defaultValue="media" className={field}>
        {PRIORITY_OPTIONS.map(p => (
          <option key={p.value} value={p.value}>
            Prioridade {p.label.toLowerCase()}
          </option>
        ))}
      </select>
      <Button type="submit" variant="primary" className="max-md:col-span-full">
        Adicionar
      </Button>
    </form>
  );
}

function TaskGroup({ title, tasks, late, action }: { title: string; tasks: Tarefa[]; late?: boolean; action?: ReactNode }) {
  if (!tasks.length) return null;
  return (
    <section data-group={title}>
      <h2 className={cn('mb-2.5 flex items-center gap-2 text-md/snug font-bold tracking-tight', late && 'text-danger')}>
        {title} <Count value={tasks.length} />
        {action}
      </h2>
      <div className="flex flex-col gap-2">
        {tasks.map(t => (
          <TaskItem key={t.id} task={t} />
        ))}
      </div>
    </section>
  );
}

function TaskItem({ task: t }: { task: Tarefa }) {
  const openForm = useOpenForm();
  const { save } = useSave();
  const h = today();
  const late = !t.feito && !!t.prazo && t.prazo < h;
  const priority = priorityOf(t);
  const toggle = async () => {
    try {
      await save('tarefas', { ...t, feito: !t.feito, feitoEm: t.feito ? '' : nowISO() });
      toast(t.feito ? 'Tarefa reaberta' : 'Tarefa concluída');
    } catch {
      /* already reported */
    }
  };
  return (
    <div
      data-task={t.titulo}
      data-done={t.feito || undefined}
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 rounded-sm border border-border px-4 py-3.5 hover:border-border-strong',
        t.feito ? 'bg-transparent' : 'bg-surface shadow-sm',
      )}
    >
      <button
        type="button"
        aria-pressed={!!t.feito}
        aria-label={`${t.feito ? 'Reabrir' : 'Concluir'}: ${t.titulo}`}
        onClick={toggle}
        className={cn(
          'grid size-6 flex-none place-items-center rounded-full border-2 transition-colors duration-150',
          t.feito ? 'border-fg bg-fg text-bg' : 'border-border-strong text-transparent hover:border-fg hover:text-fg',
        )}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-3.75">
          <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
        </svg>
      </button>
      <div>
        <div className={cn('pt-px leading-snug font-semibold [overflow-wrap:anywhere]', t.feito && 'text-fg-subtle line-through')}>
          {t.titulo}
          <SampleChip show={t.exemplo} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 empty:hidden">
          {t.prazo && <Chip tone={late ? 'bad' : t.prazo === h ? 'strong' : 'neutral'}>{prazoLabel(t.prazo)}</Chip>}
          {t.prioridade && t.prioridade !== 'media' && <Chip tone={priority.tone}>{priority.label}</Chip>}
          {t.etiqueta && <Chip tone="info">{t.etiqueta}</Chip>}
          {t.feito && t.feitoEm && <span className="text-xs text-fg-subtle">feita em {dataBR(t.feitoEm.slice(0, 10))}</span>}
        </div>
        {t.notas && <div className="mt-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-fg-muted">{t.notas}</div>}
      </div>
      <Button size="sm" variant="ghost" onClick={() => openForm({ kind: 'tarefa', id: t.id })}>
        Editar
      </Button>
    </div>
  );
}
