import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ShellUser } from '../../layouts/shellContext';

type Props = {
  user?: ShellUser;
  onLogout: () => void;
  /** Abrir el menú hacia arriba (útil en pie de sidebar) */
  dropUp?: boolean;
  align?: 'left' | 'right';
  onNavigate?: () => void;
};

export function UserMenu({ user, onLogout, dropUp, align = 'right', onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const initial =
    user?.name?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    '?';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm ring-offset-2 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de cuenta"
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-zinc-700">{initial}</span>
        )}
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-52 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'left' ? 'left-0' : 'right-0'}`}
          role="menu"
        >
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="truncate text-xs font-medium text-zinc-500">Sesión</p>
            <p className="truncate text-sm font-semibold text-zinc-900">
              {user?.name ?? user?.email ?? 'Usuario'}
            </p>
            {user?.email && user?.name ? (
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            ) : null}
          </div>
          <Link
            to="/perfil"
            role="menuitem"
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            Perfil
          </Link>
          <Link
            to="/ajustes"
            role="menuitem"
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            Ajustes
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              onLogout();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
