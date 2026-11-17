import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ConfirmButton, IconButton } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Salvar' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'primary', 'ghost', 'danger', 'danger-ghost'] },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Primary: Story = { args: { variant: 'primary', icon: 'plus', children: 'Novo pedido' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancelar' } };
export const Small: Story = { args: { size: 'sm', children: 'Editar' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };

/** Every variant side by side. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" icon="plus">
        Primário
      </Button>
      <Button>Padrão</Button>
      <Button variant="ghost">Discreto</Button>
      <Button variant="danger">Perigo</Button>
      <Button variant="danger-ghost">Perigo discreto</Button>
      <IconButton icon="close" label="Fechar" />
    </div>
  ),
};

/** First click asks for confirmation; the second one runs the action. */
export const Confirm: Story = {
  render: () => (
    <div className="flex gap-2">
      <ConfirmButton onConfirm={() => alert('Excluído')}>Excluir</ConfirmButton>
      <ConfirmButton outlined confirmLabel="Confirmar: apagar exemplos" onConfirm={() => alert('Apagados')}>
        Apagar 50 registros de exemplo
      </ConfirmButton>
    </div>
  ),
};
