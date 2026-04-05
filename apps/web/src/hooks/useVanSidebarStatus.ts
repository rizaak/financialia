import { useMemo } from 'react';
import { useFinanceStore } from '../stores/financeStore';

export type VanSidebarStatus = {
  /** Muestra punto de notificación (tareas pendientes). */
  showNotification: boolean;
  /** Texto principal del bloque. */
  message: string;
};

/**
 * Deriva el estado de Vi para el menú lateral: saldo fuera de cajita en cuentas con rendimiento = tarea pendiente.
 */
export function useVanSidebarStatus(): VanSidebarStatus {
  const accountsList = useFinanceStore((s) => s.accountsList);

  return useMemo(() => {
    if (!accountsList?.length) {
      return {
        showNotification: false,
        message: 'Vi está analizando tus tramos…',
      };
    }

    const hasPendingMoveToCajita = accountsList.some((a) => {
      if (!a.yieldStrategyId || a.status !== 'ACTIVE') return false;
      const total = Number(a.balance);
      const inCajita = Number(a.investedBalance ?? 0);
      if (!Number.isFinite(total) || !Number.isFinite(inCajita)) return false;
      return total - inCajita > 0.02;
    });

    return {
      showNotification: hasPendingMoveToCajita,
      message: hasPendingMoveToCajita
        ? 'Tienes saldo listo para mover a cajita y mejorar tu rendimiento.'
        : 'Vi está analizando tus tramos…',
    };
  }, [accountsList]);
}
