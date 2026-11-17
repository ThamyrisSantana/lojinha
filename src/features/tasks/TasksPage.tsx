import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { getRouteApi } from '@tanstack/react-router';
import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { Button, ConfirmButton } from '@/components/ui/Button';
import { Chip, Count, SampleChip } from '@/components/ui/Chip';
import { controlClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, PageHeader } from '@/components/ui/Layout';
import { Segmented } from '@/components/ui/Segmented';
import { toast } from '@/components/ui/toast';
import { moveTask, taskOrder } from '@/domain/calc';
import { ETIQUETAS, PRIORITY_OPTIONS, priorityOf } from '@/domain/constants';
import type { Priority, Tarefa } from '@/domain/types';
import { useCalc, useRemove, useSave } from '@/data/queries';
import { useOpenForm } from '@/features/forms/FormHost';
import { cn } from '@/lib/cn';
import { addDays, dataBR, nowISO, prazoLabel, today } from '@/lib/dates';
import { newId } from '@/lib/ids';
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
    <TaskGroup key={title} title={title} late={late} tasks={pending.filter(test).toSorted(taskOrder)} sortable />
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
              // Only the completed tasks on screen (the tag filter applies).
              await remove('tarefas', ...done.map(t => t.id));
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

const MOVE_HELP = 'Arraste para mudar a ordem, ou use as setas para cima e para baixo (Home e End levam ao início e ao fim).';

const MOVE_KEYS: Record<string, (i: number, last: number) => number> = {
  ArrowUp: i => i - 1,
  ArrowDown: i => i + 1,
  Home: () => 0,
  End: (_, last) => last,
};

/** A list of tasks under a heading. `sortable` lets the user put them in their own order:
 *  by dragging the handle (mouse or touch) or with the arrow keys on it. */
function TaskGroup({
  title,
  tasks,
  late,
  action,
  sortable,
}: {
  title: string;
  tasks: Tarefa[];
  late?: boolean;
  action?: ReactNode;
  sortable?: boolean;
}) {
  const { saveMany } = useSave();
  // Keyboard moves are handled by the handle itself (below), not by dnd-kit's keyboard sensor:
  // on a scrolled page that sensor scrolls instead of moving the task.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const list = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');

  // After a move, show the new order at once, until the saved data catches up (no snap back).
  const ids = tasks.map(t => t.id);
  const [moved, setMoved] = useState<string[] | null>(null);
  const [seen, setSeen] = useState(ids.join());
  if (seen !== ids.join()) {
    setSeen(ids.join());
    setMoved(null);
  }
  const shown = moved ? moved.map(id => tasks.find(t => t.id === id)).filter((t): t is Tarefa => !!t) : tasks;
  const shownIds = shown.map(t => t.id);
  const canSort = sortable && shown.length > 1;

  if (!tasks.length) return null;

  const name = (id: UniqueIdentifier) => shown.find(t => t.id === id)?.titulo ?? '';
  const place = (i: number) => `posição ${i + 1} de ${shown.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tarefa ${name(active.id)} selecionada, ${place(shownIds.indexOf(String(active.id)))}.`,
    onDragOver: ({ active, over }) => (over ? `Tarefa ${name(active.id)} na ${place(shownIds.indexOf(String(over.id)))}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `Tarefa ${name(active.id)} solta na ${place(shownIds.indexOf(String(over.id)))}.` : `Tarefa ${name(active.id)} solta.`,
    onDragCancel: ({ active }) =>
      `Movimento cancelado. Tarefa ${name(active.id)} continua na ${place(shownIds.indexOf(String(active.id)))}.`,
  };

  const move = async (from: number, to: number) => {
    const changed = moveTask(shown, from, to);
    if (!changed.length) return;
    const id = shownIds[from];
    setMoved(shownIds.toSpliced(from, 1).toSpliced(to, 0, id));
    try {
      await saveMany('tarefas', changed);
    } catch {
      setMoved(null); // already reported; the list goes back to what is stored
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) void move(shownIds.indexOf(String(active.id)), shownIds.indexOf(String(over.id)));
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const target = MOVE_KEYS[e.key]?.(from, shown.length - 1);
    if (target === undefined) return;
    e.preventDefault();
    const to = Math.max(0, Math.min(shown.length - 1, target));
    if (to === from) return setStatus(`Tarefa ${shown[from].titulo} já está na ${place(from)}.`);
    void move(from, to);
    setStatus(`Tarefa ${shown[from].titulo} movida para a ${place(to)}.`);
    // React may re-insert the moved row, which drops focus: put it back on its handle.
    const id = shownIds[from];
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-handle="${CSS.escape(id)}"]`)?.focus());
  };

  const items = (
    <div ref={list} className="flex flex-col gap-2">
      {shown.map((t, i) =>
        canSort ? <SortableTaskItem key={t.id} task={t} onKeyDown={e => onKey(e, i)} /> : <TaskItem key={t.id} task={t} />,
      )}
    </div>
  );
  return (
    <section data-group={title}>
      <h2 className={cn('mb-2.5 flex items-center gap-2 text-md/snug font-bold tracking-tight', late && 'text-danger')}>
        {title} <Count value={tasks.length} />
        {action}
      </h2>
      {canSort ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          accessibility={{ announcements, screenReaderInstructions: { draggable: MOVE_HELP } }}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={shownIds} strategy={verticalListSortingStrategy}>
            {items}
          </SortableContext>
        </DndContext>
      ) : (
        items
      )}
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </section>
  );
}

/** A task with a handle: drag it (mouse or touch) or press the arrow keys on it to change its place. */
function SortableTaskItem({ task, onKeyDown }: { task: Tarefa; onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    attributes: { roleDescription: 'tarefa reordenável' },
  });
  return (
    <TaskItem
      task={task}
      ref={setNodeRef}
      style={{ transform: DndCSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      handle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          data-handle={task.id}
          aria-label={`Mover: ${task.titulo}`}
          title="Arraste ou use as setas para mudar a ordem"
          className="-my-1 -ml-2 grid h-8 w-6 cursor-grab touch-none place-items-center rounded-sm text-fg-subtle hover:text-fg active:cursor-grabbing [&_svg]:size-4.5"
          {...attributes}
          {...listeners}
          onKeyDown={onKeyDown}
        >
          <Icon name="grip" />
        </button>
      }
    />
  );
}

function TaskItem({
  task: t,
  handle,
  dragging,
  ref,
  style,
}: {
  task: Tarefa;
  handle?: ReactNode;
  dragging?: boolean;
  ref?: Ref<HTMLDivElement>;
  style?: CSSProperties;
}) {
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
      ref={ref}
      style={style}
      data-task={t.titulo}
      data-done={t.feito || undefined}
      className={cn(
        'grid items-start gap-3.5 rounded-sm border border-border px-4 py-3.5 hover:border-border-strong',
        handle ? 'grid-cols-[auto_auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)_auto]',
        t.feito ? 'bg-transparent' : 'bg-surface shadow-sm',
        dragging && 'relative z-10 border-border-strong shadow-lg',
      )}
    >
      {handle}
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
