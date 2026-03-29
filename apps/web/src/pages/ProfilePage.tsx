import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchMe, type MeResponse } from '../api/fetchMe';
import { SectionCard } from '../components/SectionCard';
import type { ShellOutletContext } from '../layouts/shellContext';

export function ProfilePage() {
  const { getAccessToken, shellUser } = useOutletContext<ShellOutletContext>();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMe(await fetchMe(getAccessToken));
    } catch (e) {
      setMe(null);
      setError(e instanceof Error ? e.message : 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-emerald-700">Cuenta</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Perfil</h1>
        <p className="mt-1 text-sm text-zinc-500">Información de tu cuenta.</p>
      </header>

      {shellUser?.picture ? (
        <div className="mb-6 flex justify-center sm:justify-start">
          <img
            src={shellUser.picture}
            alt=""
            className="h-24 w-24 rounded-full border border-zinc-200 object-cover shadow-sm"
          />
        </div>
      ) : null}

      <SectionCard title="Acceso" subtitle="Datos de tu inicio de sesión">
        {shellUser ? (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Nombre</dt>
              <dd className="font-medium text-zinc-900">{shellUser.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="font-medium text-zinc-900">{shellUser.email ?? '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-600">Modo pruebas: perfil simplificado.</p>
        )}
      </SectionCard>

      <div className="mt-6">
        <SectionCard title="Tu perfil" subtitle="Datos guardados en Vantix">
          {loading ? (
            <p className="text-sm text-zinc-500">Cargando…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : me ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Identificador</dt>
                <dd className="break-all text-xs text-zinc-800">{me.id}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Nombre</dt>
                <dd className="font-medium text-zinc-900">{me.displayName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="font-medium text-zinc-900">{me.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Moneda por defecto</dt>
                <dd className="font-medium text-zinc-900">{me.defaultCurrency}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Zona horaria</dt>
                <dd className="font-medium text-zinc-900">{me.timezone}</dd>
              </div>
            </dl>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
