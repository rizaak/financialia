import { BarChart3, PiggyBank, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';

export type SidebarNavItem = {
  to: string;
  label: string;
  end?: boolean;
  Icon: LucideIcon;
};

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Resumen', end: true, Icon: BarChart3 },
  { to: '/cuentas', label: 'Mis cuentas', Icon: Wallet },
  { to: '/registro', label: 'Registro', Icon: PiggyBank },
  { to: '/inversiones', label: 'Inversiones', Icon: TrendingUp },
];
