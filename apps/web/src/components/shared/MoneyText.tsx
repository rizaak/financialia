import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { usePrivacyStore } from '../../stores/privacyStore';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Envuelve importes mostrados en el dashboard; aplica blur cuando "Ocultar saldos" está activo.
 */
export function MoneyText({ children, className }: Props) {
  const hide = usePrivacyStore((s) => s.hideBalances);
  return (
    <span className={cn('money-amount inline tabular-nums', hide && 'blur-md select-none', className)}>
      {children}
    </span>
  );
}
