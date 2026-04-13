import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { CategoryRow } from '../../api/categoryTypes';
import type { CreateTransactionPayload } from '../../api/fetchTransactions';
import { fetchCategories } from '../../api/fetchCategories';
import {
  createTieredHolding,
  fetchTieredStrategies,
  type TieredStrategyApi,
} from '../../api/fetchInvestments';
import { postInstallmentPlan } from '../../api/fetchCreditCard';
import type { ParseNaturalLanguageResponse } from '../../api/fetchParseNaturalLanguage';
import { useAccounts } from '../../hooks/useAccounts';
import { useViVoiceOptional } from '../../hooks/useViVoice';
import {
  VI_SUCCESS_EXPENSE_REGISTERED,
  VI_SUCCESS_INCOME_REGISTERED,
  VI_SUCCESS_MESSAGE,
  VI_SUCCESS_MSI_REGISTERED,
} from '../../config/brandConfig';
import { useTransactions } from '../../hooks/useTransactions';
import { formatMoney } from '../../lib/formatMoney';
import { localDateInputToIsoMidday } from '../../lib/localCalendarRange';
import {
  phraseCardPaymentEncouragement,
  phraseExpenseRegistered,
  phraseIncomeRegistered,
  phraseInvestmentRegistered,
  phraseMsiRegistered,
} from '../../lib/viVoicePhrases';
import { normalizeMoneyInputTyping, parseMoneyInput } from '../../lib/parseMoneyInput';
import { formGlassFieldSx } from '../shared/formGlassSx';

type TxKind = 'EXPENSE' | 'INCOME';

export type TransactionReviewDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  /** JSON devuelto por Vi (parse natural). */
  initialValues: ParseNaturalLanguageResponse | null;
  onSaved: () => void | Promise<void>;
  /** Si true, tras guardar se usa speechSynthesis (solo cuando el flujo abrió el diálogo por voz). */
  allowVoiceTts?: boolean;
};

function todayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tipo de movimiento inferido por Vi (incluye INVESTMENT). */
function resolveAiTransactionType(p: ParseNaturalLanguageResponse | null): 'EXPENSE' | 'INCOME' | 'INVESTMENT' {
  if (!p) return 'EXPENSE';
  if (p.aiTransactionType) return p.aiTransactionType;
  if (p.isInvestment) return 'INVESTMENT';
  return p.transactionType;
}

function aiTypeLabel(p: ParseNaturalLanguageResponse): string {
  const t = resolveAiTransactionType(p);
  if (t === 'INVESTMENT') return 'Inversión';
  return t === 'INCOME' ? 'Ingreso' : 'Gasto';
}

function shouldCreateInstallmentPlan(p: ParseNaturalLanguageResponse | null, expenseKind: TxKind): boolean {
  if (!p || expenseKind !== 'EXPENSE') return false;
  const months = p.installmentMonths ?? 0;
  const isInst = p.installmentPurchase || p.isInstallment === true;
  if (!isInst || months < 2) return false;
  return resolveAiTransactionType(p) === 'EXPENSE';
}

export function TransactionReviewDialog({
  open,
  onClose,
  getAccessToken,
  defaultCurrency,
  initialValues,
  onSaved,
  allowVoiceTts = false,
}: TransactionReviewDialogProps) {
  const viVoice = useViVoiceOptional();
  const { postTransaction } = useTransactions(getAccessToken);
  const { accounts, accountsList, loading: accountsLoading, error: accountsStoreError, refresh: refreshAccounts } =
    useAccounts(getAccessToken);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [strategies, setStrategies] = useState<TieredStrategyApi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [strategiesError, setStrategiesError] = useState<string | null>(null);

  const [kind, setKind] = useState<TxKind>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingSuggestedCategoryId, setPendingSuggestedCategoryId] = useState<string | null>(null);
  const [pendingSuggestedAccountId, setPendingSuggestedAccountId] = useState<string | null>(null);

  const [applyDefaultTierStrategy, setApplyDefaultTierStrategy] = useState(true);
  const [strategyId, setStrategyId] = useState('');
  const [payoutFrequency, setPayoutFrequency] = useState<'DAILY' | 'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [autoReinvest, setAutoReinvest] = useState(false);

  const curCode = defaultCurrency.toUpperCase().slice(0, 3);

  const filteredCategories = useMemo(
    () => [...categories].filter((c) => c.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [categories, kind],
  );

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.id === strategyId) ?? null,
    [strategies, strategyId],
  );

  const accountAutoMatched = Boolean(
    initialValues?.suggestedAccountId && accountId && initialValues.suggestedAccountId === accountId,
  );

  const loadCategories = useCallback(async () => {
    setLoadError(null);
    try {
      const cats = await fetchCategories(getAccessToken);
      setCategories(cats);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudieron cargar categorías.');
      setCategories([]);
    }
  }, [getAccessToken]);

  const loadStrategies = useCallback(async () => {
    setStrategiesError(null);
    try {
      const list = await fetchTieredStrategies(getAccessToken);
      setStrategies(list);
    } catch (e) {
      setStrategiesError(e instanceof Error ? e.message : 'No se pudieron cargar estrategias.');
      setStrategies([]);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!open) return;
    void loadCategories();
    if (accountsList === null && !accountsLoading) {
      void refreshAccounts();
    }
  }, [open, accountsList, accountsLoading, loadCategories, refreshAccounts]);

  useEffect(() => {
    if (!open || resolveAiTransactionType(initialValues) !== 'INVESTMENT') return;
    void loadStrategies();
  }, [open, initialValues, loadStrategies]);

  useEffect(() => {
    if (!open || !initialValues) return;
    setKind(initialValues.transactionType);
    setAmount(initialValues.amount > 0 ? String(initialValues.amount) : '');
    setDescription(initialValues.description || '');
    setPendingSuggestedCategoryId(initialValues.suggestedCategoryId);
    setPendingSuggestedAccountId(initialValues.suggestedAccountId);
    setCategoryId('');
    setAccountId('');
    setFormError(null);
    setApplyDefaultTierStrategy(true);
    setPayoutFrequency('MONTHLY');
    setAutoReinvest(false);
    setStrategyId('');
  }, [open, initialValues]);

  useEffect(() => {
    if (!open || filteredCategories.length === 0) return;
    setCategoryId((prev) => {
      if (prev && filteredCategories.some((c) => c.id === prev)) return prev;
      if (
        pendingSuggestedCategoryId &&
        filteredCategories.some((c) => c.id === pendingSuggestedCategoryId)
      ) {
        return pendingSuggestedCategoryId;
      }
      return filteredCategories[0]?.id ?? '';
    });
  }, [open, filteredCategories, pendingSuggestedCategoryId]);

  useEffect(() => {
    if (!open || accounts.length === 0) return;
    setAccountId((prev) => {
      if (prev && accounts.some((a) => a.id === prev)) return prev;
      if (pendingSuggestedAccountId && accounts.some((a) => a.id === pendingSuggestedAccountId)) {
        return pendingSuggestedAccountId;
      }
      return '';
    });
  }, [open, accounts, pendingSuggestedAccountId]);

  useEffect(() => {
    if (!open || resolveAiTransactionType(initialValues) !== 'INVESTMENT' || strategies.length === 0) return;
    const withTiers = strategies.filter((s) => s.tiers.length > 0);
    const pick = withTiers[0] ?? strategies[0];
    if (pick && !strategyId) {
      setStrategyId(pick.id);
    }
  }, [open, initialValues, strategies, strategyId]);

  const handleKindChange = (_: React.MouseEvent<HTMLElement>, next: TxKind | null) => {
    if (next == null) return;
    setKind(next);
    setPendingSuggestedCategoryId(null);
    setCategoryId('');
  };

  const handleConfirm = async () => {
    setFormError(null);
    const amt = parseMoneyInput(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Indica un monto válido.');
      return;
    }
    if (!accountId) {
      setFormError('Indica la cuenta del movimiento.');
      return;
    }
    if (shouldCreateInstallmentPlan(initialValues, kind)) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc?.type !== 'CREDIT_CARD') {
        setFormError('Las compras a meses (MSI) deben registrarse en una tarjeta de crédito.');
        return;
      }
      if (!categoryId) {
        setFormError('Indica la categoría.');
        return;
      }
      const instMonths = Math.round(initialValues!.installmentMonths ?? 0);
      setSubmitting(true);
      const id = toast.loading(
        initialValues!.installmentInterestFree !== false
          ? 'Registrando plan MSI sin intereses…'
          : 'Registrando compra a meses…',
      );
      try {
        await postInstallmentPlan(getAccessToken, accountId, {
          totalAmount: amt,
          totalInstallments: instMonths,
          categoryId,
          concept: description.trim() || 'Compra a meses',
          isInterestFree: initialValues!.installmentInterestFree !== false,
          interestRate: initialValues!.installmentInterestFree === false ? 0 : undefined,
          occurredAt: localDateInputToIsoMidday(todayInputDate()),
          source: 'AI_ASSISTANT',
          description: description.trim() || undefined,
        });
        const accLabel = accounts.find((a) => a.id === accountId)?.name ?? 'tu tarjeta';
        toast.success(VI_SUCCESS_MSI_REGISTERED, {
          id,
          description: `${instMonths} meses · ${accLabel}`,
        });
        if (allowVoiceTts) viVoice?.speak(phraseMsiRegistered(instMonths));
        onClose();
        await onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo registrar el plan', { id });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (resolveAiTransactionType(initialValues) === 'INVESTMENT' && applyDefaultTierStrategy) {
      if (!strategyId || !selectedStrategy?.tiers.length) {
        setFormError(
          'No hay una estrategia de tramos válida. Crea una en Inversiones o desactiva “Aplicar estrategia por defecto”.',
        );
        return;
      }
      setSubmitting(true);
      const id = toast.loading('Creando inversión por tramos…');
      try {
        const name =
          description.trim().slice(0, 120) ||
          `Inversión ${new Date().toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}`;
        await createTieredHolding(getAccessToken, {
          strategyId,
          originAccountId: accountId,
          name,
          initialDeposit: amt,
          currency: curCode,
          payoutFrequency,
          autoReinvest,
        });
        const accLabel = accounts.find((a) => a.id === accountId)?.name ?? 'tu cuenta';
        toast.success(VI_SUCCESS_MESSAGE, {
          id,
          description: `Inversión de ${formatMoney(amt, curCode)} en ${accLabel}.`,
        });
        if (allowVoiceTts) viVoice?.speak(phraseInvestmentRegistered());
        onClose();
        await onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo crear la inversión', { id });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!categoryId) {
      setFormError('Indica la categoría.');
      return;
    }

    setSubmitting(true);
    const accountLabel = accounts.find((a) => a.id === accountId)?.name ?? 'tu cuenta';
    const payload: CreateTransactionPayload = {
      accountId,
      categoryId,
      type: kind,
      amount: amt,
      concept: description.trim() || 'Movimiento',
      occurredAt: localDateInputToIsoMidday(todayInputDate()),
      currency: curCode,
      source: 'AI_ASSISTANT',
    };
    try {
      const result = await postTransaction(payload, {
        successMessage:
          kind === 'INCOME' ? VI_SUCCESS_INCOME_REGISTERED : VI_SUCCESS_EXPENSE_REGISTERED,
        successDescription: `${formatMoney(amt, curCode)} · ${accountLabel}`,
        loadingMessage: 'Guardando…',
      });
      if (result !== undefined) {
        const catLabel = categories.find((c) => c.id === categoryId)?.name ?? 'tu categoría';
        const acc = accounts.find((a) => a.id === accountId);
        const amtLabel = formatMoney(amt, curCode);
        const first = viVoice?.userFirstName ?? 'Inversor';
        if (allowVoiceTts) {
          if (kind === 'EXPENSE' && acc?.type === 'CREDIT_CARD') {
            viVoice?.speak(phraseCardPaymentEncouragement(first));
          } else if (kind === 'INCOME') {
            viVoice?.speak(phraseIncomeRegistered(amtLabel, catLabel));
          } else {
            viVoice?.speak(phraseExpenseRegistered(amtLabel, catLabel));
          }
        }
        onClose();
        await onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      fullWidth
      maxWidth="md"
      slotProps={{
        backdrop: {
          className: 'backdrop-blur-md bg-black/35 dark:bg-black/50',
          sx: { backdropFilter: 'blur(12px)' },
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          maxWidth: 520,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Sparkles size={22} strokeWidth={2} aria-hidden />
        Revisar movimiento
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {initialValues ? (
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.08, fontWeight: 700 }}>
                La IA entendió esto
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (t) =>
                    t.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.06)',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  }}
                >
                  <AiCell label="Monto" value={formatMoney(initialValues.amount, curCode)} />
                  <AiCell label="Tipo" value={aiTypeLabel(initialValues)} />
                  {initialValues.installmentPurchase && (initialValues.installmentMonths ?? 0) >= 2 ? (
                    <AiCell
                      label="MSI / meses"
                      value={`${initialValues.installmentMonths ?? '—'} meses · ${initialValues.installmentInterestFree !== false ? 'sin intereses' : 'con intereses'}`}
                    />
                  ) : null}
                  <AiCell label="Descripción" value={initialValues.description || '—'} />
                  <AiCell label="Categoría (Vi)" value={initialValues.category || '—'} />
                  <AiCell
                    label="Cuenta detectada"
                    value={initialValues.targetAccount ?? '— (sin coincidencia clara)'}
                  />
                </Box>
              </Paper>
              {initialValues.creditCardExpenseAcknowledgment ? (
                <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
                  {initialValues.creditCardExpenseAcknowledgment}
                </Alert>
              ) : null}
              {initialValues.liquidityWarning ? (
                <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                  {initialValues.liquidityWarning}
                </Alert>
              ) : null}
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.08, fontWeight: 700 }}>
                Tu ajuste
              </Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {loadError || accountsStoreError ? (
                  <Alert severity="warning">{loadError ?? accountsStoreError}</Alert>
                ) : null}

                <TextField
                  label="Monto"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="$0.00"
                  value={amount}
                  onChange={(e) => setAmount(normalizeMoneyInputTyping(e.target.value))}
                  fullWidth
                  required
                  sx={formGlassFieldSx}
                />

                <TextField
                  label="Concepto o descripción"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />

                <ToggleButtonGroup exclusive value={kind} onChange={handleKindChange} fullWidth size="small">
                  <ToggleButton value="EXPENSE">Gasto</ToggleButton>
                  <ToggleButton value="INCOME">Ingreso</ToggleButton>
                </ToggleButtonGroup>

                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <FormControl fullWidth required>
                      <InputLabel id="review-acc-label">Cuenta</InputLabel>
                      <Select
                        labelId="review-acc-label"
                        label="Cuenta"
                        value={accountId}
                        onChange={(e: SelectChangeEvent<string>) => setAccountId(e.target.value)}
                      >
                        {accounts.map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {a.name} ({a.currency})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  {accountAutoMatched ? (
                    <Chip
                      size="small"
                      icon={<CheckCircle2 size={14} aria-hidden />}
                      label="Seleccionada automáticamente (coincide con Vi)"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  ) : null}
                </Box>

                {!(
                  resolveAiTransactionType(initialValues) === 'INVESTMENT' && applyDefaultTierStrategy
                ) ? (
                  <Autocomplete
                    options={filteredCategories}
                    getOptionLabel={(o) => o.name}
                    value={filteredCategories.find((c) => c.id === categoryId) ?? null}
                    onChange={(_, v) => setCategoryId(v?.id ?? '')}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(params) => <TextField {...params} label="Categoría" required />}
                  />
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Al usar inversión por tramos, el cargo se hace desde la cuenta origen; la categoría de gasto no
                    aplica en ese flujo.
                  </Alert>
                )}

                {resolveAiTransactionType(initialValues) === 'INVESTMENT' ? (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                      Tramos de interés (según Vi)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Si lo deseas, abre una inversión por tramos usando una estrategia ya definida (mismas tasas y
                      topes que en Inversiones).
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={applyDefaultTierStrategy}
                          onChange={(_, v) => setApplyDefaultTierStrategy(v)}
                          color="primary"
                        />
                      }
                      label="Aplicar estrategia por defecto (tramos)"
                    />
                    {applyDefaultTierStrategy ? (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        {strategiesError ? <Alert severity="warning">{strategiesError}</Alert> : null}
                        <FormControl fullWidth size="small">
                          <InputLabel id="strat-label">Estrategia</InputLabel>
                          <Select
                            labelId="strat-label"
                            label="Estrategia"
                            value={strategyId}
                            onChange={(e) => setStrategyId(e.target.value)}
                          >
                            {strategies
                              .filter((s) => s.tiers.length > 0)
                              .map((s) => (
                                <MenuItem key={s.id} value={s.id}>
                                  {s.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                        {selectedStrategy && selectedStrategy.tiers.length > 0 ? (
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              Tramos de la estrategia
                            </Typography>
                            <Table size="small" sx={{ borderRadius: 1, overflow: 'hidden' }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>#</TableCell>
                                  <TableCell align="right">Tasa nominal anual</TableCell>
                                  <TableCell align="right">Tope acumulado</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedStrategy.tiers.map((t) => (
                                  <TableRow key={t.id}>
                                    <TableCell>{t.sortOrder + 1}</TableCell>
                                    <TableCell align="right">{Number(t.annualRatePct).toFixed(2)}%</TableCell>
                                    <TableCell align="right">
                                      {t.upperLimit == null ? 'Sin techo' : formatMoney(t.upperLimit, curCode)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        ) : (
                          <Alert severity="warning">
                            No hay estrategias con tramos. Crea una en la sección Inversiones o desactiva esta opción
                            para registrar solo un movimiento contable.
                          </Alert>
                        )}
                        <Divider />
                        <FormControl fullWidth size="small">
                          <InputLabel id="payout-label">Frecuencia de pago de intereses</InputLabel>
                          <Select
                            labelId="payout-label"
                            label="Frecuencia de pago de intereses"
                            value={payoutFrequency}
                            onChange={(e) =>
                              setPayoutFrequency(e.target.value as 'DAILY' | 'MONTHLY' | 'ANNUAL')
                            }
                          >
                            <MenuItem value="DAILY">Diaria</MenuItem>
                            <MenuItem value="MONTHLY">Mensual</MenuItem>
                            <MenuItem value="ANNUAL">Anual</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={autoReinvest}
                              onChange={(_, v) => setAutoReinvest(v)}
                              size="small"
                            />
                          }
                          label="Reinvertir intereses automáticamente"
                        />
                      </Stack>
                    ) : null}
                  </Paper>
                ) : null}

                {formError ? <Alert severity="error">{formError}</Alert> : null}
              </Stack>
            </Box>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          className="!normal-case !text-zinc-600 hover:!bg-zinc-100 dark:!text-zinc-300 dark:hover:!bg-zinc-800"
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="!normal-case !bg-gradient-to-r !from-[#3b82f6] !to-[#2563eb] !text-white hover:!from-[#60a5fa] hover:!to-[#3b82f6] !shadow-[0_4px_14px_rgba(59,130,246,0.45)]"
        >
          {submitting ? 'Guardando…' : 'Confirmar registro'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AiCell({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
