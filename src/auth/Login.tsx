/* Login screen (only with Supabase configured). Also used to set a new password after
   opening the "forgot my password" link. */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/app/Shell';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { supabase } from '@/data/supabase';
import { cn } from '@/lib/cn';

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
};

const password = z.string().min(6, 'A senha tem pelo menos 6 caracteres.');
const signInSchema = z.object({ email: z.email('Digite um e-mail válido.'), password });
/** Setting a new password: the e-mail field is hidden and not checked. */
const newPasswordSchema = z.object({ email: z.string(), password });
type SignIn = z.infer<typeof signInSchema>;

export function Login({ mode }: { mode: 'signIn' | 'newPassword' }) {
  const newPassword = mode === 'newPassword';
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);
  const form = useForm<SignIn>({
    resolver: zodResolver(newPassword ? newPasswordSchema : signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async ({ email, password }) => {
    setMessage(null);
    const sb = supabase!;
    const { error } = newPassword ? await sb.auth.updateUser({ password }) : await sb.auth.signInWithPassword({ email, password });
    if (error) setMessage({ text: ERRORS[error.message] || error.message || 'Não foi possível entrar.' });
    else if (newPassword) setMessage({ text: 'Senha alterada.', ok: true });
  });

  const forgot = async () => {
    const email = form.getValues('email').trim();
    if (!email) {
      setMessage({ text: 'Digite seu e-mail acima e clique de novo.' });
      form.setFocus('email');
      return;
    }
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    setMessage(error ? { text: error.message } : { text: 'Se esse e-mail tiver conta, chega um link para criar nova senha.', ok: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-6">
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={submit}
          className="flex w-[min(400px,100%)] flex-col gap-4 rounded-lg border border-border bg-surface px-8 pt-9 pb-7 shadow-lg"
        >
          <Logo className="mx-auto mb-1 size-22" />
          <h1 className="text-center text-2xl font-bold tracking-tight">{newPassword ? 'Criar nova senha' : 'Entrar no painel'}</h1>
          <p className="text-center text-fg-muted">
            {newPassword ? 'Digite a nova senha para sua conta.' : 'Use o e-mail e a senha da sua conta.'}
          </p>
          {!newPassword && <TextField name="email" label="E-mail" type="email" autoComplete="username" />}
          <TextField
            name="password"
            label={newPassword ? 'Nova senha' : 'Senha'}
            type="password"
            autoComplete={newPassword ? 'new-password' : 'current-password'}
          />
          <Button type="submit" variant="primary" className="w-full py-3" disabled={form.formState.isSubmitting}>
            {newPassword ? 'Salvar senha' : 'Entrar'}
          </Button>
          <div role="status" className={cn('min-h-[1em] text-center text-sm', message?.ok ? 'text-success' : 'text-danger')}>
            {message?.text}
          </div>
          {!newPassword && (
            <button type="button" onClick={forgot} className="text-center text-sm text-fg-muted underline underline-offset-3 hover:text-fg">
              Esqueci minha senha
            </button>
          )}
        </form>
      </FormProvider>
    </main>
  );
}
