import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DECIMAL } from '@/lib/format';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { CheckboxField, FieldGrid, Fieldset, Preview, SelectField, TextareaField, TextField } from './Field';

const meta = { title: 'UI/Form' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const schema = z.object({
  nome: z.string().trim().min(1, 'Dê um nome ao insumo.'),
  unidade: z.string(),
  custo: z.string().regex(DECIMAL, 'Digite só números (ex.: 12,50).'),
  obs: z.string(),
  ativo: z.boolean(),
});

function ExampleForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', unidade: 'un', custo: 'abc', obs: '', ativo: true },
    mode: 'onTouched',
  });
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(v => alert(JSON.stringify(v)))} className="flex max-w-2xl flex-col gap-6">
        <Fieldset legend="Insumo">
          <FieldGrid>
            <TextField name="nome" label="Nome" full placeholder="Ex.: Papel couché 250g A4" />
            <SelectField name="unidade" label="Unidade de medida" options={['un', 'folha', 'ml']} />
            <TextField name="custo" label="Custo por unidade (R$)" decimal help="Usado até a primeira compra." />
            <CheckboxField name="ativo" label="Em uso" />
            <TextareaField name="obs" label="Observações" full />
          </FieldGrid>
        </Fieldset>
        <Preview
          items={[
            { label: 'Custo total', value: 'R$ 3,53' },
            { label: 'Sugerido', value: 'R$ 8,90' },
            { label: 'Lucro / peça', value: 'R$ 4,31', big: true },
          ]}
          line="materiais R$ 1,17 + perda R$ 0,06 + mão de obra R$ 2,00 + extras R$ 0,30"
        />
        <div>
          <Button type="submit" variant="primary">
            Salvar (mostra os erros)
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
export const FieldsAndValidation: Story = { render: () => <ExampleForm /> };

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const form = useForm({ defaultValues: { nome: '' } });
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Abrir formulário
      </Button>
      {open && (
        <FormProvider {...form}>
          <Drawer title="Novo insumo" onClose={() => setOpen(false)} onSubmit={form.handleSubmit(() => setOpen(false))}>
            <Fieldset>
              <FieldGrid>
                <TextField name="nome" label="Nome" full />
              </FieldGrid>
            </Fieldset>
          </Drawer>
        </FormProvider>
      )}
    </>
  );
}
/** Side drawer built on the native <dialog>: focus moves in, Escape closes, the page behind is inert. */
export const SideDrawer: Story = { render: () => <DrawerDemo /> };
