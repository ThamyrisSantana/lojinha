// Component tests (Testing Library): behavior users rely on, checked through what they see.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DECIMAL } from '@/lib/format';
import { ConfirmButton } from './Button';
import { TextField } from './Field';
import { Segmented } from './Segmented';

test('a destructive button asks for confirmation before acting', async () => {
  const onConfirm = vi.fn();
  render(<ConfirmButton onConfirm={onConfirm}>Excluir</ConfirmButton>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Excluir' }));
  expect(onConfirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

test('a segmented control marks the chosen option as pressed', async () => {
  const onChange = vi.fn();
  render(
    <Segmented
      label="Mostrar"
      value="a"
      onChange={onChange}
      options={[
        { value: 'a', label: 'Todos' },
        { value: 'b', label: 'Na fila' },
      ]}
    />,
  );
  expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Na fila' }));
  expect(onChange).toHaveBeenCalledWith('b');
});

function PriceForm({ onValid }: { onValid: (v: unknown) => void }) {
  const form = useForm({
    resolver: zodResolver(z.object({ preco: z.string().regex(DECIMAL, 'Digite só números.') })),
    defaultValues: { preco: '' },
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValid)}>
        <TextField name="preco" label="Preço (R$)" help="Deixe vazio para usar o sugerido." decimal />
        <button type="submit">Salvar</button>
      </form>
    </FormProvider>
  );
}

test('a form field shows its error and links help and error to the input', async () => {
  const onValid = vi.fn();
  render(<PriceForm onValid={onValid} />);
  const user = userEvent.setup();
  const input = screen.getByLabelText('Preço (R$)');
  expect(input).toHaveAccessibleDescription('Deixe vazio para usar o sugerido.');

  await user.type(input, 'dez');
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByText('Digite só números.')).toBeVisible();
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(/Digite só números/);
  expect(onValid).not.toHaveBeenCalled();

  await user.clear(input);
  await user.type(input, '12,50');
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(onValid).toHaveBeenCalledWith({ preco: '12,50' }, expect.anything());
});
