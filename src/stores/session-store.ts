import { create } from 'zustand';

import type { AppUser } from '@/domain/user';
import { getStoredUser, signInWithPassword, signOut } from '@/services/auth';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  user: AppUser | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'idle',
  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const user = await getStoredUser();
      set({ user, status: user ? 'authenticated' : 'unauthenticated' });
    } catch (error) {
      console.error('Session hydrate failed', error);
      set({ user: null, status: 'unauthenticated' });
    }
  },
  signIn: async (email, password) => {
    set({ status: 'loading' });
    try {
      const user = await signInWithPassword(email, password);
      set({ user, status: 'authenticated' });
      return user;
    } catch (error) {
      set({ status: 'unauthenticated' });
      throw error;
    }
  },
  signOut: async () => {
    await signOut();
    set({ user: null, status: 'unauthenticated' });
  },
}));
