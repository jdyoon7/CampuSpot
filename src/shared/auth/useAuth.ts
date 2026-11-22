import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AccountError, loadAccount } from './account';

type Identity = Awaited<ReturnType<typeof loadAccount>>;
export type AuthState =
  | { status: 'unconfigured' | 'loading' | 'signed-out' }
  | { status: 'error'; user: User; error: AccountError }
  | { status: 'ready'; user: User; account: Identity };
export const AuthContext = createContext<{
  state: AuthState;
  refresh: () => void;
} | null>(null);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw Error('AuthProvider missing');
  return ctx;
}
