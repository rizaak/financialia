import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PrivacyState = {
  hideBalances: boolean;
  setHideBalances: (v: boolean) => void;
  /** Sincroniza con GET /me/profile (fuente de verdad al iniciar sesión). */
  hydrateFromServer: (hide: boolean) => void;
};

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      hideBalances: false,
      setHideBalances: (v) => set({ hideBalances: v }),
      hydrateFromServer: (hide) => set({ hideBalances: hide }),
    }),
    { name: 'vantix-privacy' },
  ),
);
