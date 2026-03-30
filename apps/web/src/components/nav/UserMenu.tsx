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
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-sm ring-offset-2 ring-offset-[#020617] hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de cuenta"
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-zinc-200">{initial}</span>
        )}
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-52 rounded-xl border border-white/10 bg-zinc-900/95 py-1 shadow-lg backdrop-blur-md ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'left' ? 'left-0' : 'right-0'}`}
          role="menu"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="truncate text-xs font-medium text-zinc-500">Sesión</p>
            <p className="truncate text-sm font-semibold text-zinc-100">
              {user?.name ?? user?.email ?? 'Usuario'}
            </p>
            {user?.email && user?.name ? (
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            ) : null}
          </div>
          <Link
            to="/perfil"
            role="menuitem"
            className="block px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
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
            className="block px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
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
            className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/15"
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
