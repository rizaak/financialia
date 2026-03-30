import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  AppBar,
  Badge,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Bell, ChevronLeft, ChevronRight, Eye, EyeOff, Menu as MenuIcon } from 'lucide-react';
import { fetchMe } from '../api/fetchMe';
import { fetchProfile } from '../api/fetchProfile';
import { patchProfile } from '../api/patchProfile';
import { LogoVantix } from '../components/brand/LogoVantix';
import { MuiAccountMenu } from '../components/nav/MuiAccountMenu';
import { SidebarNav } from '../components/nav/SidebarNav';
import { SIDEBAR_NAV_ITEMS } from '../components/nav/sidebarNavConfig';
import { FinancialChatDrawerTrigger } from '../components/shell/FinancialChatDrawerTrigger';
import { SmartCommandBar } from '../components/shell/SmartCommandBar';
import { ShellQuickActionsFab } from '../components/shell/ShellQuickActionsFab';
import { VanAssistant } from '../components/shell/VanAssistant';
import { useVanSidebarStatus } from '../hooks/useVanSidebarStatus';
import { normalizeDisplayCurrency, type DisplayCurrency } from '../lib/displayCurrency';
import { useFinanceStore } from '../stores/financeStore';
import { usePrivacyStore } from '../stores/privacyStore';
import type { ShellOutletContext, ShellUser } from './shellContext';

const DRAWER_FULL = 260;
const DRAWER_MINI = 72;

type Props = {
  getAccessToken: () => Promise<string>;
  user?: ShellUser;
  onLogout: () => void;
  configHint?: ReactNode;
};

export function MainLayout({ getAccessToken, user, onLogout, configHint }: Props) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mini, setMini] = useState(false);
  const [defaultCurrency, setDefaultCurrencyState] = useState<DisplayCurrency>('MXN');
  const balanceRevision = useFinanceStore((s) => s.balancesRevision);
  const hideBalances = usePrivacyStore((s) => s.hideBalances);
  const setHideBalances = usePrivacyStore((s) => s.setHideBalances);
  const hydratePrivacyFromServer = usePrivacyStore((s) => s.hydrateFromServer);

  const setDefaultCurrency = useCallback((c: DisplayCurrency) => {
    setDefaultCurrencyState(c);
  }, []);

  const notifyTransactionSaved = useCallback(() => {
    void useFinanceStore.getState().refreshBalancesAfterMutation(getAccessToken);
  }, [getAccessToken]);

  useEffect(() => {
    void useFinanceStore.getState().fetchAccounts(getAccessToken);
  }, [getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe(getAccessToken);
        if (!cancelled) {
          setDefaultCurrencyState(normalizeDisplayCurrency(me.defaultCurrency));
        }
      } catch {
        /* mantener MXN */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await fetchProfile(getAccessToken);
        if (!cancelled) {
          hydratePrivacyFromServer(p.hideBalances);
        }
      } catch {
        /* mantener preferencia local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, hydratePrivacyFromServer]);

  const togglePrivacyBalances = useCallback(async () => {
    const next = !hideBalances;
    setHideBalances(next);
    try {
      const p = await patchProfile(getAccessToken, { hideBalances: next });
      hydratePrivacyFromServer(p.hideBalances);
    } catch {
      setHideBalances(!next);
    }
  }, [getAccessToken, hideBalances, hydratePrivacyFromServer, setHideBalances]);

  const outletContext: ShellOutletContext = {
    getAccessToken,
    configHint,
    shellUser: user,
    defaultCurrency,
    setDefaultCurrency,
    balanceRevision,
    notifyTransactionSaved,
  };

  const drawerWidth = isMdUp ? (mini ? DRAWER_MINI : DRAWER_FULL) : DRAWER_FULL;
  const narrow = isMdUp && mini;
  const vanSidebarStatus = useVanSidebarStatus();

  function renderDrawerContent(showMini: boolean) {
    return (
      <Box sx={{ overflow: 'auto', height: '100%' }}>
        <SidebarNav
          items={SIDEBAR_NAV_ITEMS}
          showMini={showMini}
          onNavigate={() => setMobileOpen(false)}
          vanStatus={vanSidebarStatus}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'transparent',
        background: 'radial-gradient(at top left, #0f172a, #020617)',
        backgroundAttachment: 'fixed',
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          transition: (muiTheme) =>
            muiTheme.transitions.create(['width', 'margin'], {
              easing: muiTheme.transitions.easing.sharp,
              duration: muiTheme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar
          sx={{
            gap: 1,
            flexWrap: 'wrap',
            py: { xs: 1.25, sm: 1 },
            minHeight: { xs: 'auto', sm: 64 },
            alignItems: 'center',
          }}
        >
          {!isMdUp ? (
            <IconButton
              color="inherit"
              aria-label="abrir menú"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ order: 1 }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <IconButton
              color="inherit"
              aria-label={mini ? 'expandir menú' : 'contraer menú'}
              edge="start"
              onClick={() => setMini((m) => !m)}
              sx={{ order: 1 }}
            >
              {mini ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
            </IconButton>
          )}
          {!isMdUp ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                order: 2,
              }}
            >
              <LogoVantix size={28} />
              <Typography variant="subtitle1" fontWeight={700}>
                Vantix
              </Typography>
            </Box>
          ) : null}
          <Box
            sx={{
              order: { xs: 4, md: 3 },
              flex: { md: 1 },
              flexBasis: { xs: '100%', md: 0 },
              display: 'flex',
              justifyContent: { xs: 'stretch', md: 'flex-end' },
              minWidth: 0,
              mx: { xs: 0, md: 1 },
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 400,
                ml: { md: 'auto' },
                borderRadius: 9999,
                overflow: 'hidden',
              }}
            >
              <SmartCommandBar
                getAccessToken={getAccessToken}
                defaultCurrency={defaultCurrency}
                onTransactionSaved={notifyTransactionSaved}
                variant="toolbar"
              />
            </Box>
          </Box>
          <Box
            sx={{
              order: { xs: 3, md: 4 },
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              ml: { xs: 'auto', md: 0 },
            }}
          >
            <IconButton color="inherit" aria-label="notificaciones" size="small">
              <Badge color="error" variant="dot" invisible>
                <Bell size={22} />
              </Badge>
            </IconButton>
            <Tooltip title={hideBalances ? 'Mostrar importes' : 'Ocultar importes (privacidad)'}>
              <IconButton
                color="inherit"
                aria-label={hideBalances ? 'Mostrar importes' : 'Ocultar importes'}
                aria-pressed={hideBalances}
                size="small"
                onClick={() => void togglePrivacyBalances()}
              >
                {hideBalances ? <Eye size={22} /> : <EyeOff size={22} />}
              </IconButton>
            </Tooltip>
            <MuiAccountMenu user={user} onLogout={onLogout} onNavigate={() => setMobileOpen(false)} />
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            /** Por encima del AppBar (drawer+1) y del FAB (drawer+2): el input IA no tapa el menú. */
            zIndex: (muiTheme) => muiTheme.zIndex.modal,
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_FULL },
          }}
        >
          {renderDrawerContent(false)}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: (muiTheme) =>
                muiTheme.transitions.create('width', {
                  easing: muiTheme.transitions.easing.sharp,
                  duration: muiTheme.transitions.duration.enteringScreen,
                }),
            },
          }}
          open
        >
          {renderDrawerContent(narrow)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 128, md: 64 } }} />
        <VanAssistant />
        <div className="grid w-full max-w-full grid-cols-12 gap-4 sm:gap-6">
          <div className="col-span-12 min-w-0">
            {configHint}
            <Outlet context={outletContext} />
          </div>
        </div>
        <Box
          component="footer"
          sx={{
            mt: 6,
            pt: 3,
            pb: 2,
            textAlign: 'center',
            borderTop: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            © 2026 Vantix. Todos los derechos reservados.
          </Typography>
        </Box>
      </Box>
      <FinancialChatDrawerTrigger getAccessToken={getAccessToken} />
      <ShellQuickActionsFab getAccessToken={getAccessToken} defaultCurrency={defaultCurrency} />
    </Box>
  );
}
