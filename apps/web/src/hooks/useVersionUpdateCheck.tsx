import { useEffect } from 'react';
import { toast } from 'sonner';
import { APP_VERSION } from '../lib/appVersion';

type VersionPayload = {
  version: string;
};

function versionJsonUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}version.json`;
}

async function fetchServerVersion(): Promise<string> {
  const url = `${versionJsonUrl()}?t=${Date.now()}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`version.json ${res.status}`);
  const data = (await res.json()) as VersionPayload;
  if (typeof data?.version !== 'string' || !data.version.trim()) {
    throw new Error('version.json inválido');
  }
  return data.version.trim();
}

/** Evita dos comprobaciones en paralelo (React StrictMode). */
let versionCheckLock = false;
/** Evita toast duplicado si hubiera carrera. */
let versionUpdateToastShown = false;

/**
 * Compara la versión embebida en el bundle con `public/version.json` en el servidor.
 * Si difieren, muestra un toast estilo Van para recargar y cargar el nuevo despliegue.
 */
export function useVersionUpdateCheck() {
  useEffect(() => {
    if (versionCheckLock) return;
    versionCheckLock = true;

    void (async () => {
      try {
        const serverVersion = await fetchServerVersion();
        if (serverVersion === APP_VERSION) return;
        if (versionUpdateToastShown) return;
        versionUpdateToastShown = true;

        toast.custom(
          (id) => (
            <button
              type="button"
              className="flex w-full max-w-[min(100vw-2rem,420px)] cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-[rgba(15,23,42,0.92)] p-4 text-left shadow-lg backdrop-blur-md transition hover:border-sky-400/40"
              onClick={() => {
                toast.dismiss(id);
                window.location.reload();
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                style={{
                  background: 'linear-gradient(145deg, #38bdf8 0%, #2563eb 50%, #a78bfa 100%)',
                  boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
                }}
                aria-hidden
              >
                V
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-sky-300/90">
                  Van
                </span>
                <span className="mt-0.5 block text-sm font-medium leading-snug text-slate-100">
                  {`¡He aprendido trucos nuevos! (v${serverVersion}). Haz clic para actualizar Vantix.`}
                </span>
              </span>
            </button>
          ),
          { duration: Infinity, id: 'vantix-version-update' },
        );
      } catch {
        /* sin version.json o red: no molestar */
      }
    })();
  }, []);
}
