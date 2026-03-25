import type { ShellUser } from '../../layouts/shellContext';
import { UserMenu } from './UserMenu';

type Props = {
  user?: ShellUser;
  onLogout: () => void;
  onNavigate?: () => void;
  onOpenSidebar: () => void;
};

export function AppTopBar({ user, onLogout, onNavigate, onOpenSidebar }: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 lg:hidden"
        aria-label="Abrir menú lateral"
        onClick={onOpenSidebar}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-zinc-900 lg:hidden">
        FinancialIA
      </span>
      <div className="ml-auto shrink-0">
        <UserMenu user={user} onLogout={onLogout} onNavigate={onNavigate} align="right" />
      </div>
    </header>
  );
}
