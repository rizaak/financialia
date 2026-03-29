import type { ReactNode } from 'react';
import type { DisplayCurrency } from '../lib/displayCurrency';

export type ShellUser = {
  email?: string;
  name?: string;
  picture?: string;
};

export type ShellOutletContext = {
  getAccessToken: () => Promise<string>;
  configHint?: ReactNode;
  shellUser?: ShellUser;
  defaultCurrency: DisplayCurrency;
  setDefaultCurrency: (c: DisplayCurrency) => void;
  /** Revisión global de saldos (Zustand); sube tras mutaciones y refrescos. */
  balanceRevision: number;
  notifyTransactionSaved: () => void;
};
