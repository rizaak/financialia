import { Link, NavLink } from 'react-router-dom';
import { SIDEBAR_NAV_ITEMS } from './sidebarNavConfig';

type Props = {
  onNavigate?: () => void;
};

export function AppSidebar({ onNavigate }: Props) {
  function onLink() {
    onNavigate?.();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-6">
        <Link
          to="/dashboard"
          className="block text-lg font-bold tracking-tight text-zinc-900"
          onClick={onLink}
        >
          Financialia
        </Link>
        <p className="mt-0.5 text-xs text-zinc-500">Finanzas personales</p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1 px-3 pb-8" aria-label="Principal">
        {SIDEBAR_NAV_ITEMS.map(({ to, label, end, gradient, shadow, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={Boolean(end)}
            onClick={onLink}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${gradient} ${shadow} transition ${
                    isActive ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-emerald-50' : 'opacity-95 group-hover:opacity-100 group-hover:scale-[1.02]'
                  }`}
                  aria-hidden
                >
                  {icon}
                </span>
                <span className="min-w-0">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
