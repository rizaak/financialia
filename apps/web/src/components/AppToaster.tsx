import { Toaster } from 'sonner';

/**
 * Toaster global con colores semánticos: éxito esmeralda, advertencia ámbar, error rosa.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      toastOptions={{
        duration: 4500,
        classNames: {
          toast: 'border shadow-md rounded-xl',
          success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
          error: 'border-rose-200 bg-rose-50 text-rose-950',
          warning: 'border-amber-200 bg-amber-50 text-amber-950',
          loading: 'border-zinc-200 bg-white text-zinc-900',
        },
      }}
    />
  );
}
