import { useAuth0 } from '@auth0/auth0-react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Shield } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchProfile, type UserProfileResponse } from '../api/fetchProfile';
import { patchProfile } from '../api/patchProfile';
import { patchMe } from '../api/patchMe';
import type { ShellOutletContext } from '../layouts/shellContext';
import { isAuth0Configured } from '../lib/auth0Configured';
import { normalizeDisplayCurrency, type DisplayCurrency } from '../lib/displayCurrency';
import { ArchivedAccountsSettingsPanel } from '../settings/ArchivedAccountsSettingsPanel';
import { RecurringIncomeSettingsPanel } from '../settings/RecurringIncomeSettingsPanel';
import { usePrivacyStore } from '../stores/privacyStore';

function Auth0EmailLine() {
  const { user } = useAuth0();
  return (
    <Typography variant="caption" color="text.secondary">
      Sesión Auth0: {user?.email ?? '—'}
    </Typography>
  );
}

function TabPanel(props: { value: number; index: number; children: React.ReactNode }) {
  const { value, index, children } = props;
  if (value !== index) return null;
  return <Box sx={{ py: 2 }}>{children}</Box>;
}

const CURRENCIES: { value: DisplayCurrency; label: string }[] = [
  { value: 'MXN', label: 'MXN — Peso mexicano' },
  { value: 'USD', label: 'USD — Dólar estadounidense' },
];

export function SettingsPage() {
  const { getAccessToken, defaultCurrency, setDefaultCurrency, notifyTransactionSaved } =
    useOutletContext<ShellOutletContext>();

  const hideBalances = usePrivacyStore((s) => s.hideBalances);
  const setHideBalances = usePrivacyStore((s) => s.setHideBalances);
  const hydrateFromServer = usePrivacyStore((s) => s.hydrateFromServer);

  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE');
  const [language, setLanguage] = useState('es-MX');
  const [timezone, setTimezone] = useState('UTC');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchProfile(getAccessToken);
      setProfile(p);
      hydrateFromServer(p.hideBalances);
      setMonthlyBudget(p.monthlyBudget ?? '');
      setRiskTolerance(p.riskTolerance);
      setLanguage(p.language);
      setTimezone(p.timezone);
      setAvatarUrl(p.avatarUrl ?? '');
      setDisplayName(p.displayName ?? '');
      setDefaultCurrency(normalizeDisplayCurrency(p.baseCurrency));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, hydrateFromServer, setDefaultCurrency]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const h = window.location.hash.replace(/^#/, '');
    if (h === 'elementos-archivados') {
      setTab(4);
    }
  }, []);

  async function saveProfileSection() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const budgetNum = monthlyBudget.trim() === '' ? undefined : Number(monthlyBudget.replace(/,/g, ''));
      const updated = await patchProfile(getAccessToken, {
        monthlyBudget: budgetNum !== undefined && Number.isFinite(budgetNum) ? budgetNum : undefined,
        riskTolerance,
        language,
        timezone,
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setProfile(updated);
      setDefaultCurrency(normalizeDisplayCurrency(updated.baseCurrency));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function saveCurrency(c: DisplayCurrency) {
    setSaving(true);
    setError(null);
    try {
      const [me, p] = await Promise.all([
        patchMe(getAccessToken, { defaultCurrency: c }),
        patchProfile(getAccessToken, { baseCurrency: c }),
      ]);
      setDefaultCurrency(normalizeDisplayCurrency(me.defaultCurrency));
      setProfile((prev) =>
        prev
          ? { ...prev, baseCurrency: p.baseCurrency, defaultCurrency: p.defaultCurrency }
          : p,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar moneda');
    } finally {
      setSaving(false);
    }
  }

  async function togglePrivacy(next: boolean) {
    const prev = hideBalances;
    setHideBalances(next);
    try {
      const p = await patchProfile(getAccessToken, { hideBalances: next });
      hydrateFromServer(p.hideBalances);
    } catch (e) {
      setHideBalances(prev);
      setError(e instanceof Error ? e.message : 'No se pudo guardar privacidad');
    }
  }

  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim();
  const mfaUrl =
    auth0Domain && !auth0Domain.startsWith('http')
      ? `https://${auth0Domain}/u/account-security`
      : auth0Domain
        ? `${auth0Domain.replace(/\/$/, '')}/u/account-security`
        : '';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Typography variant="h4" fontWeight={800} color="text.primary">
        Configuración
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        Perfil, ingresos fijos (nómina), elementos archivados, seguridad y privacidad.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
        >
          <Tab label="Perfil" />
          <Tab label="Mis Ingresos Fijos" />
          <Tab label="Seguridad" />
          <Tab label="Privacidad" />
          <Tab label="Elementos archivados" />
        </Tabs>

        <CardContent>
          {loading ? (
            <Typography color="text.secondary">Cargando…</Typography>
          ) : (
            <>
              <TabPanel value={tab} index={0}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Moneda base y presupuesto
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel id="currency-label">Moneda</InputLabel>
                    <Select
                      labelId="currency-label"
                      label="Moneda"
                      value={defaultCurrency}
                      disabled={saving}
                      onChange={(e) => void saveCurrency(e.target.value as DisplayCurrency)}
                    >
                      {CURRENCIES.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Presupuesto mensual (referencia)"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    fullWidth
                    helperText="Importe en tu moneda base; solo orientativo."
                    inputProps={{ inputMode: 'decimal' }}
                  />
                  <FormControl fullWidth>
                    <InputLabel id="risk-label">Tolerancia al riesgo</InputLabel>
                    <Select
                      labelId="risk-label"
                      label="Tolerancia al riesgo"
                      value={riskTolerance}
                      onChange={(e) =>
                        setRiskTolerance(e.target.value as 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE')
                      }
                    >
                      <MenuItem value="CONSERVATIVE">Conservador</MenuItem>
                      <MenuItem value="MODERATE">Moderado</MenuItem>
                      <MenuItem value="AGGRESSIVE">Agresivo</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Idioma"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    fullWidth
                    placeholder="es-MX"
                  />
                  <TextField
                    label="Zona horaria"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    fullWidth
                    placeholder="America/Mexico_City"
                  />
                  <Divider />
                  <Typography variant="subtitle2" color="text.secondary">
                    Foto de perfil (URL)
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar src={avatarUrl || undefined} sx={{ width: 56, height: 56 }} />
                    <TextField
                      label="URL de imagen"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      fullWidth
                      placeholder="https://…"
                    />
                  </Stack>
                  <TextField
                    label="Nombre para mostrar"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    fullWidth
                  />
                  <Button variant="contained" disabled={saving} onClick={() => void saveProfileSection()}>
                    Guardar perfil
                  </Button>
                </Stack>
              </TabPanel>

              <TabPanel value={tab} index={1}>
                <RecurringIncomeSettingsPanel getAccessToken={getAccessToken} defaultCurrency={defaultCurrency} />
              </TabPanel>

              <TabPanel value={tab} index={2}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Inicios de sesión recientes
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    El detalle de dispositivos y sesiones remotas requiere Auth0 Management API. Aquí se muestra
                    la sesión actual.
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Sesión actual (este navegador)"
                        secondary={
                          profile
                            ? `Última actualización de perfil: ${new Date(profile.userUpdatedAt).toLocaleString('es-MX')}`
                            : '—'
                        }
                      />
                    </ListItem>
                  </List>
                  <Divider />
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Shield size={20} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Autenticación en dos factores (MFA)
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Activa o gestiona MFA desde tu cuenta Auth0 (contraseña, SMS, app autenticadora).
                  </Typography>
                  {mfaUrl ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      href={mfaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir seguridad de cuenta en Auth0
                    </Button>
                  ) : (
                    <Typography variant="caption" color="warning.main">
                      Configura VITE_AUTH0_DOMAIN en la app web para enlazar con Auth0.
                    </Typography>
                  )}
                  {isAuth0Configured() ? (
                    <Auth0EmailLine />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Modo desarrollo (sin Auth0)
                    </Typography>
                  )}
                </Stack>
              </TabPanel>

              <TabPanel value={tab} index={3}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Modo ocultar saldos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aplica un efecto de desenfoque a los importes en el dashboard (también disponible en la barra
                    superior).
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hideBalances}
                        onChange={(_, v) => void togglePrivacy(v)}
                        color="primary"
                      />
                    }
                    label="Ocultar importes en pantalla"
                  />
                </Stack>
              </TabPanel>

              <TabPanel value={tab} index={4}>
                <ArchivedAccountsSettingsPanel
                  getAccessToken={getAccessToken}
                  notifyTransactionSaved={notifyTransactionSaved}
                />
              </TabPanel>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
