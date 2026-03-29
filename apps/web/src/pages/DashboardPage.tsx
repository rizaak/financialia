import { useOutletContext } from 'react-router-dom';
import { DashboardView } from '../dashboard/DashboardView';
import type { ShellOutletContext } from '../layouts/shellContext';

export function DashboardPage() {
  const { getAccessToken, configHint, defaultCurrency } = useOutletContext<ShellOutletContext>();
  return (
    <DashboardView
      getAccessToken={getAccessToken}
      configHint={configHint}
      defaultCurrency={defaultCurrency}
    />
  );
}
