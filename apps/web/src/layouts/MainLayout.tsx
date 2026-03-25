import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { fetchMe } from '../api/fetchMe';
import { AppSidebar } from '../components/nav/AppSidebar';
import { AppTopBar } from '../components/nav/AppTopBar';
import { normalizeDisplayCurrency, type DisplayCurrency } from '../lib/displayCurrency';
import type { ShellOutletContext, ShellUser } from './shellContext';

type Props = {
  getAccessToken: () => Promise<string>;
  user?: ShellUser;
  onLogout: () => void;
  configHint?: ReactNode;
};

export function MainLayout({ getAccessToken, user, onLogout, configHint }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defaultCurrency, setDefaultCurrencyState] = useState<DisplayCurrency>('USD');
  const [financeDataRevision, setFinanceDataRevision] = useState(0);
  const closeSidebar = () => setSidebarOpen(false);

  const setDefaultCurrency = useCallback((c: DisplayCurrency) => {
    setDefaultCurrencyState(c);
  }, []);

  const notifyTransactionSaved = useCallback(() => {
    setFinanceDataRevision((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe(getAccessToken);
        if (!cancelled) {
          setDefaultCurrencyState(normalizeDisplayCurrency(me.defaultCurrency));
        }
      } catch {
        /* mantener USD por defecto */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  const outletContext: ShellOutletContext = {
    getAccessToken,
    configHint,
    shellUser: user,
    defaultCurrency,
    setDefaultCurrency,
    financeDataRevision,
    notifyTransactionSaved,
  };

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Cerrar menú lateral"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <AppSidebar onNavigate={closeSidebar} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopBar
          user={user}
          onLogout={onLogout}
          onNavigate={closeSidebar}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
