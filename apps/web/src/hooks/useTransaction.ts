import { useCallback } from 'react';
import { toast } from 'sonner';
import { toFriendlyErrorMessage } from '../lib/http/toFriendlyErrorMessage';

export type TransactionToastOptions = {
  /** Mensaje mientras espera la API (toast.loading). */
  loadingMessage?: string;
  /** Título del toast de éxito. */
  successMessage: string;
  /** Texto secundario bajo el título (descripción). */
  successDescription?: string;
  /** Título del toast de error (la descripción se deriva del error). */
  errorTitle?: string;
  /**
   * Id estable para reemplazar el toast de carga (patrón Sonner).
   * Si no se pasa, se genera uno por operación.
   */
  toastId?: string;
};

/**
 * Encapsula operaciones financieras (gastos, ingresos, transferencias, inversiones):
 * toast de carga → éxito o error con mensajes legibles (sin JSON crudo).
 */
export function useTransaction() {
  const run = useCallback(
    async <T>(operation: () => Promise<T>, options: TransactionToastOptions): Promise<T | undefined> => {
      const id = options.toastId ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      toast.loading(options.loadingMessage ?? 'Procesando movimiento…', { id });
      try {
        const result = await operation();
        toast.success(options.successMessage, {
          id,
          description: options.successDescription,
        });
        return result;
      } catch (error) {
        toast.error(options.errorTitle ?? 'No se pudo completar la operación', {
          id,
          description: toFriendlyErrorMessage(error),
        });
        return undefined;
      }
    },
    [],
  );

  return { run };
}
