import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './Button';
import { Chip, Count, SampleChip } from './Chip';
import { Icon, ICON_NAMES } from './Icon';
import { EmptyState, HeadingNote, Note, PageHeader, Panel } from './Layout';
import { MonthNav } from './MonthNav';
import { Segmented } from './Segmented';
import { Avatar, HBar, Kpi } from './Stats';
import { DataTable, NameCell } from './Table';
import { toast, Toaster } from './toast';

const meta = { title: 'UI/Display', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Chips: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Chip>Neutro</Chip>
      <Chip tone="good">Ok</Chip>
      <Chip tone="warn">Repor</Chip>
      <Chip tone="bad">Acabou</Chip>
      <Chip tone="info">Produção</Chip>
      <Chip tone="strong">Hoje</Chip>
      <SampleChip show />
      <Count value={3} />
      <Count value={6} hot />
    </div>
  ),
};

export const Icons: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      {ICON_NAMES.map(n => (
        <div key={n} className="flex flex-col items-center gap-2 text-xs text-fg-muted">
          <Icon name={n} />
          {n}
        </div>
      ))}
    </div>
  ),
};

export const Header: Story = {
  render: () => (
    <PageHeader
      eyebrow="Bom dia!"
      title={
        <>
          Como a <em>lojinha</em> está indo
        </>
      }
      description="Resumo do mês: quanto entrou, quanto saiu e o que precisa da sua atenção."
      actions={
        <Button variant="primary" icon="plus">
          Novo pedido
        </Button>
      }
    />
  ),
};

export const Stats: Story = {
  render: () => (
    <div className="grid grid-cols-[1.35fr_repeat(3,minmax(0,1fr))] gap-3.5">
      <Kpi featured label="Lucro do mês" value="R$ 413,56" tip="Quanto as vendas renderam depois do custo das peças vendidas.">
        margem 69,6% · ▲ R$ 264,15 vs set/26
      </Kpi>
      <Kpi label="Vendas" value="R$ 594,50">
        ▲ 121,2% vs set/26
      </Kpi>
      <Kpi label="Caixa do mês" value="−R$ 81,00" negative>
        recebido R$ 19,00 − gastos R$ 100,00
      </Kpi>
      <Kpi label="Pedidos" value={4}>
        ticket médio R$ 148,63
      </Kpi>
    </div>
  ),
};

export const PanelWithBars: Story = {
  render: () => (
    <Panel title="Vendas por canal" aside={<HeadingNote>out/26</HeadingNote>} className="max-w-xl">
      <HBar label="Feira / evento" ratio={1} value="R$ 374,00" />
      <HBar label="Instagram" ratio={0.37} value="R$ 140,00" variant="secondary" />
      <HBar label="Devolução" ratio={0} value="−R$ 12,00" negative />
    </Panel>
  ),
};

export const Avatars: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar name="Botton" />
      <Avatar name="Print" shape="square" />
      <Avatar name="Chaveiro" size="sm" />
      <Avatar name="Imagem quebrada" image="data:image/png;base64,broken" />
    </div>
  ),
};

export const Table: Story = {
  render: () => (
    <DataTable
      caption="Insumos"
      rows={[
        { id: '1', nome: 'Papel couché 250g', cat: 'Papel', estoque: 97 },
        { id: '2', nome: 'Kit botton 38mm', cat: 'Botton', estoque: 16 },
      ]}
      rowKey={r => r.id}
      columns={[
        { header: 'Insumo', cell: r => <NameCell name={r.nome} sub={r.cat} /> },
        { header: 'Em estoque', numeric: true, cell: r => r.estoque },
        { header: 'Situação', cell: r => <Chip tone={r.estoque > 20 ? 'good' : 'warn'}>{r.estoque > 20 ? 'Ok' : 'Repor'}</Chip> },
      ]}
    />
  ),
};

export const Feedback: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <Note>O lucro já desconta a taxa da plataforma.</Note>
      <Note tone="warn">2 pedidos sem nota fiscal registrada.</Note>
      <EmptyState
        title="Nenhum pedido ainda"
        action={
          <Button variant="primary" icon="plus">
            Novo pedido
          </Button>
        }
      >
        Registre as vendas de cada canal para acompanhar faturamento e estoque.
      </EmptyState>
      <div>
        <Button onClick={() => toast('Salvo')}>Mostrar toast</Button>
        <Toaster />
      </div>
    </div>
  ),
};

function Controls() {
  const [month, setMonth] = useState('2026-10');
  const [filter, setFilter] = useState<'todos' | 'fila'>('todos');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <MonthNav value={month} onChange={setMonth} />
      <Segmented
        label="Mostrar"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'todos', label: 'Todos', count: 5 },
          { value: 'fila', label: 'Na fila', count: 3 },
        ]}
      />
    </div>
  );
}
export const Navigation: Story = { render: () => <Controls /> };
