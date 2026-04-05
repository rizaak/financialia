import { useEffect } from 'react';
import { toast } from 'sonner';
import { APP_NAME, VI_NAME, VI_AVATAR_GRADIENT } from '../config/brandConfig';
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
 * Si difieren, muestra un toast estilo Vi para recargar y cargar el nuevo despliegue.
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
                  background: VI_AVATAR_GRADIENT,
                  boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
                }}
                aria-hidden
              >
                {VI_NAME}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-sky-300/90">
                  {VI_NAME}
                </span>
                <span className="mt-0.5 block text-sm font-medium leading-snug text-slate-100">
                  {`¡He aprendido trucos nuevos! (v${serverVersion}). Haz clic para actualizar ${APP_NAME}.`}
                </span>
              </span>
            </button>
          ),
          { duration: Infinity, id: 'vidya-version-update' },
        );
      } catch {
        /* sin version.json o red: no molestar */
      }
    })();
  }, []);
}
