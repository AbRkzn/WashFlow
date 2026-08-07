import { create } from 'zustand';

export type Role = 'admin' | 'manager' | 'cashier' | 'washer';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface SessionState {
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));
