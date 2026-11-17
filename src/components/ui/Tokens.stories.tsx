import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = { title: 'Foundations/Tokens' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const COLORS = [
  ['bg', 'page background'],
  ['surface', 'cards, panels, sidebar'],
  ['surface-muted', 'inputs on cards, toggles'],
  ['surface-sunken', 'table headers, row hover'],
  ['border', 'dividers'],
  ['border-strong', 'inputs, buttons'],
  ['fg', 'text'],
  ['fg-muted', 'secondary text'],
  ['fg-subtle', 'captions'],
  ['accent', 'primary button, active nav, featured card'],
  ['success', 'status dot: ok'],
  ['warning', 'status dot: attention'],
  ['danger', 'status dot: problem, errors'],
  ['chart-1', 'sales bars'],
  ['chart-2', 'expense bars'],
];
const TEXT = ['3xl', '2xl', 'xl', 'lg', 'md', 'base', 'sm', 'xs', '2xs'];

/** Semantic colors (switch the theme in the toolbar). Components use only these: bg-surface, text-fg-muted… */
export const Colors: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      {COLORS.map(([name, use]) => (
        <div key={name} className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="h-14 border-b border-border" style={{ background: `var(--color-${name})` }} />
          <div className="p-3">
            <b className="block font-mono text-xs">{name}</b>
            <span className="text-xs text-fg-subtle">{use}</span>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {TEXT.map(t => (
        <div key={t} className="flex items-baseline gap-4">
          <code className="w-16 font-mono text-xs text-fg-subtle">text-{t}</code>
          <span style={{ fontSize: `var(--text-${t})` }} className="font-semibold">
            Como a lojinha está indo
          </span>
        </div>
      ))}
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div className="flex gap-4">
      {['sm', 'md', 'lg', 'full'].map(r => (
        <div key={r} className={`grid size-24 place-items-center border border-border-strong bg-surface text-xs rounded-${r}`}>
          rounded-{r}
        </div>
      ))}
    </div>
  ),
};
