/* Who is using the app. In demo mode there is no login; with Supabase the session decides
   between the login screen and the dashboard. */
import type { User } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { isDemoMode, supabase } from '@/data/supabase';

export type AuthState =
  | { status: 'demo'; user: null }
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  /** Opened from a "forgot my password" e-mail: asks for a new password. */
  | { status: 'recovery'; user: User | null }
  | { status: 'signedIn'; user: User };

const AuthContext = createContext<AuthState>({ status: 'loading', user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    isDemoMode
      ? { status: 'demo', user: null }
      : location.hash.includes('type=recovery')
        ? { status: 'recovery', user: null }
        : { status: 'loading', user: null },
  );

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setState({ status: 'recovery', user: session?.user ?? null });
      else if (session?.user)
        setState(s => (s.status === 'recovery' && event !== 'USER_UPDATED' ? s : { status: 'signedIn', user: session.user }));
      else setState({ status: 'signedOut', user: null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export const useAuth = () => use(AuthContext);

/** Id of the signed-in user, or null in demo mode. */
export function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === 'signedIn' ? auth.user.id : null;
}
