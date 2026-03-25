import type { ReactNode } from 'react';

const stroke = { fill: 'none' as const, viewBox: '0 0 24 24' as const, stroke: 'currentColor' as const };

function IconResumen() {
  return (
    <svg className="h-5 w-5" {...stroke} strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function IconCuentas() {
  return (
    <svg className="h-5 w-5" {...stroke} strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  );
}

function IconRegistro() {
  return (
    <svg className="h-5 w-5" {...stroke} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconInversiones() {
  return (
    <svg className="h-5 w-5" {...stroke} strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
      />
    </svg>
  );
}

export type SidebarNavItem = {
  to: string;
  label: string;
  end?: boolean;
  /** Clases Tailwind `bg-gradient-to-br from-X to-Y` */
  gradient: string;
  /** Sombra suave acorde al color */
  shadow: string;
  icon: ReactNode;
};

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    to: '/dashboard',
    label: 'Resumen',
    end: true,
    gradient: 'from-sky-500 to-emerald-600',
    shadow: 'shadow-md shadow-emerald-600/25',
    icon: <IconResumen />,
  },
  {
    to: '/cuentas',
    label: 'Mis cuentas',
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-md shadow-orange-500/30',
    icon: <IconCuentas />,
  },
  {
    to: '/registro',
    label: 'Registro',
    gradient: 'from-violet-500 to-fuchsia-600',
    shadow: 'shadow-md shadow-fuchsia-600/25',
    icon: <IconRegistro />,
  },
  {
    to: '/inversiones',
    label: 'Inversiones',
    gradient: 'from-teal-500 to-cyan-600',
    shadow: 'shadow-md shadow-cyan-600/25',
    icon: <IconInversiones />,
  },
];
