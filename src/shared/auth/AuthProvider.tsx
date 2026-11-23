import { useEffect, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { errorFor, loadAccount } from './account';
import { AuthContext, type AuthState } from './useAuth';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    userId: string;
    version: number;
    state: AuthState;
  }>();
  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session) setResult(undefined);
      setUser(session?.user ?? null);
    }).data.subscription;
    return () => subscription?.unsubscribe();
  }, []);
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !user) return;
    let active = true;
    const publish = (state: AuthState) => {
      if (active) setResult({ userId, version, state });
    };
    loadAccount(userId).then(
      (account) => publish({ status: 'ready', user, account }),
      (error) => publish({ status: 'error', user, error: errorFor(error) }),
    );
    return () => {
      active = false;
    };
  }, [user, userId, version]);
  let state: AuthState = { status: 'loading' };
  if (!supabase) state = { status: 'unconfigured' };
  else if (user === null) state = { status: 'signed-out' };
  else if (userId && result?.userId === userId && result.version === version)
    state = result.state;
  return (
    <AuthContext.Provider
      value={{ state, refresh: () => setVersion((v) => v + 1) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
