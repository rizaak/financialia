import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Banknote, Building2, CreditCard, Landmark, Wallet } from 'lucide-react';
import { useEffect, useMemo, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { AccountRow } from '../../api/fetchAccounts';
import {
  postCashAdvanceInstallment,
  type PostCashAdvanceInstallmentBody,
} from '../../api/fetchCashAdvanceInstallment';
import type { CategoryRow } from '../../api/categoryTypes';
import { VI_NAME } from '../../config/brandConfig';
import { useFinanceStore } from '../../stores/financeStore';
import { annualPctForCashAdvance, computeAmortizingMonthlyPayment } from '../../lib/cashAdvanceMath';
import { formatMoney } from '../../lib/formatMoney';
import { normalizeMoneyInputTyping, parseMoneyInput } from '../../lib/parseMoneyInput';
import {
  cashAdvanceGlassFieldSx,
  cashAdvanceGlassSelectSx,
} from './formGlassSx';

const TERM_MONTHS = [3, 6, 9, 12, 18, 24] as const;

const uuidMsg = 'Selecciona una opción válida';

const formSchema = z
  .object({
    operationKind: z.enum(['IMMEDIATE_CASH_FIXED', 'ATM_WITHDRAWAL']),
    registrationMode: z.enum(['INJECT_TO_ACCOUNT', 'DEBT_ONLY']),
    initialInstallment: z.number().int().min(1, 'Mínimo 1'),
    withdrawnAmount: z.string().min(1, 'Indica el monto'),
    interestAnnualPct: z.string().optional(),
    dailyRatePct: z.string().optional(),
    totalInstallments: z
      .number()
      .refine((n) => TERM_MONTHS.includes(n as (typeof TERM_MONTHS)[number]), { message: 'Plazo no válido' }),
    dispositionFee: z.string().optional(),
    creditAccountId: z.string().uuid('Elige la tarjeta'),
    cashAccountId: z.string().optional(),
    expenseCategoryId: z.string().uuid('Categoría de gasto'),
    incomeCategoryId: z.string().optional(),
    concept: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const w = parseMoneyInput(data.withdrawnAmount);
    if (!Number.isFinite(w) || w <= 0) {
      ctx.addIssue({ code: 'custom', path: ['withdrawnAmount'], message: 'Monto inválido' });
    }
    if (data.initialInstallment > data.totalInstallments) {
      ctx.addIssue({
        code: 'custom',
        path: ['initialInstallment'],
        message: `No puede ser mayor que ${data.totalInstallments} (plazo).`,
      });
    }
    if (data.registrationMode === 'INJECT_TO_ACCOUNT') {
      if (!data.cashAccountId || !z.string().uuid().safeParse(data.cashAccountId).success) {
        ctx.addIssue({ code: 'custom', path: ['cashAccountId'], message: uuidMsg });
      }
      if (!data.incomeCategoryId || !z.string().uuid().safeParse(data.incomeCategoryId).success) {
        ctx.addIssue({ code: 'custom', path: ['incomeCategoryId'], message: uuidMsg });
      }
    }
    const annual = data.interestAnnualPct?.trim()
      ? Number(String(data.interestAnnualPct).replace(',', '.'))
      : undefined;
    const daily = data.dailyRatePct?.trim()
      ? Number(String(data.dailyRatePct).replace(',', '.'))
      : undefined;
    const eff = annualPctForCashAdvance(data.operationKind, annual, daily);
    if (eff == null) {
      if (data.operationKind === 'IMMEDIATE_CASH_FIXED') {
        ctx.addIssue({
          code: 'custom',
          path: ['interestAnnualPct'],
          message: 'Indica la tasa anual pactada',
        });
      } else {
        ctx.addIssue({
          code: 'custom',
          path: ['dailyRatePct'],
          message: 'Indica tasa diaria o tasa anual',
        });
      }
    }
  });

export type CashAdvanceFormValues = z.infer<typeof formSchema>;

export type CashAdvanceRegisterDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  categories: CategoryRow[];
  accounts: AccountRow[];
  defaultCurrency: string;
  onSaved: () => void | Promise<void>;
};

function AccountGlyph({ type }: { type: AccountRow['type'] }) {
  const c = { size: 20, strokeWidth: 2 } as const;
  if (type === 'BANK') return <Building2 {...c} />;
  if (type === 'WALLET') return <Wallet {...c} />;
  if (type === 'CREDIT_CARD') return <CreditCard {...c} />;
  return <Banknote {...c} />;
}

export function CashAdvanceRegisterDialog({
  open,
  onClose,
  getAccessToken,
  categories,
  accounts,
  defaultCurrency,
  onSaved,
}: CashAdvanceRegisterDialogProps) {
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);

  const inCurrency = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase().slice(0, 3) === cur),
    [accounts, cur],
  );
  const creditCards = useMemo(() => inCurrency.filter((a) => a.type === 'CREDIT_CARD'), [inCurrency]);
  const cashAccounts = useMemo(
    () => inCurrency.filter((a) => a.type === 'BANK' || a.type === 'WALLET' || a.type === 'CASH'),
    [inCurrency],
  );
  const expenseCats = useMemo(() => categories.filter((c) => c.kind === 'EXPENSE'), [categories]);
  const incomeCats = useMemo(() => categories.filter((c) => c.kind === 'INCOME'), [categories]);

  const form = useForm<CashAdvanceFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      operationKind: 'IMMEDIATE_CASH_FIXED',
      registrationMode: 'INJECT_TO_ACCOUNT',
      initialInstallment: 1,
      withdrawnAmount: '',
      interestAnnualPct: '',
      dailyRatePct: '',
      totalInstallments: 12,
      dispositionFee: '',
      creditAccountId: '',
      cashAccountId: '',
      expenseCategoryId: '',
      incomeCategoryId: '',
      concept: '',
      notes: '',
    },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const opKind = watch('operationKind');
  const withdrawnStr = watch('withdrawnAmount');
  const feeStr = watch('dispositionFee');
  const annualStr = watch('interestAnnualPct');
  const dailyStr = watch('dailyRatePct');
  const nInst = watch('totalInstallments');
  const regMode = watch('registrationMode');
  const initialInst = watch('initialInstallment');
  const inject = regMode === 'INJECT_TO_ACCOUNT';

  useEffect(() => {
    if (!open) return;
    reset({
      operationKind: 'IMMEDIATE_CASH_FIXED',
      registrationMode: 'INJECT_TO_ACCOUNT',
      initialInstallment: 1,
      withdrawnAmount: '',
      interestAnnualPct: '',
      dailyRatePct: '',
      totalInstallments: 12,
      dispositionFee: '',
      creditAccountId: creditCards[0]?.id ?? '',
      cashAccountId: cashAccounts[0]?.id ?? '',
      expenseCategoryId: expenseCats[0]?.id ?? '',
      incomeCategoryId: incomeCats[0]?.id ?? '',
      concept: '',
      notes: '',
    });
  }, [open, reset, creditCards, cashAccounts, expenseCats, incomeCats]);

  const preview = useMemo(() => {
    const w = parseMoneyInput(withdrawnStr);
    const fee = feeStr?.trim() ? parseMoneyInput(feeStr) : 0;
    const annual = annualStr?.trim() ? Number(String(annualStr).replace(',', '.')) : undefined;
    const daily = dailyStr?.trim() ? Number(String(dailyStr).replace(',', '.')) : undefined;
    const eff = annualPctForCashAdvance(opKind, annual, daily);
    const principal = (Number.isFinite(w) ? w : 0) + (Number.isFinite(fee) ? fee : 0);
    if (eff == null || principal <= 0 || !Number.isFinite(nInst) || nInst < 1) {
      return null;
    }
    const monthly = computeAmortizingMonthlyPayment(principal, eff, nInst);
    return { principal, monthly, eff };
  }, [withdrawnStr, feeStr, annualStr, dailyStr, opKind, nInst]);

  async function onSubmit(values: CashAdvanceFormValues) {
    const withdrawn = parseMoneyInput(values.withdrawnAmount);
    const fee = values.dispositionFee?.trim() ? parseMoneyInput(values.dispositionFee) : 0;
    const annual = values.interestAnnualPct?.trim()
      ? Number(String(values.interestAnnualPct).replace(',', '.'))
      : undefined;
    const daily = values.dailyRatePct?.trim()
      ? Number(String(values.dailyRatePct).replace(',', '.'))
      : undefined;

    const tid = toast.loading('Registrando disposición…');
    try {
      const payload: PostCashAdvanceInstallmentBody = {
        operationKind: values.operationKind,
        withdrawnAmount: withdrawn,
        totalInstallments: values.totalInstallments,
        expenseCategoryId: values.expenseCategoryId,
        registrationMode: values.registrationMode,
        initialInstallment: values.initialInstallment,
      };
      if (values.registrationMode === 'INJECT_TO_ACCOUNT') {
        payload.cashAccountId = values.cashAccountId;
        payload.incomeCategoryId = values.incomeCategoryId;
      }
      if (values.operationKind === 'IMMEDIATE_CASH_FIXED') {
        payload.interestAnnualPct = annual ?? 0;
      } else {
        if (daily != null && Number.isFinite(daily) && daily > 0) {
          payload.dailyRatePct = daily;
        } else if (annual != null && Number.isFinite(annual)) {
          payload.interestAnnualPct = annual;
        }
      }
      if (fee > 0) payload.dispositionFee = fee;
      if (values.concept?.trim()) payload.concept = values.concept.trim();
      if (values.notes?.trim()) payload.notes = values.notes.trim();

      await postCashAdvanceInstallment(getAccessToken, values.creditAccountId, payload);
      await refreshBalancesAfterMutation(getAccessToken);
      const descInject = `Entendido. He cargado ${formatMoney(String(withdrawn), cur)} a tu cuenta y programado las mensualidades.`;
      const descDebt =
        'Registro guardado. Daré seguimiento a tus pagos sin afectar tus saldos actuales.';
      toast.success(VI_NAME, {
        id: tid,
        description: values.registrationMode === 'INJECT_TO_ACCOUNT' ? descInject : descDebt,
        duration: 6500,
      });
      await onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo registrar.';
      toast.error(msg, { id: tid });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(165deg, rgba(34,211,238,0.12) 0%, rgba(15,23,42,0.92) 38%, rgba(15,23,42,0.97) 100%)',
          border: '1px solid rgba(34, 211, 238, 0.28)',
          boxShadow: '0 12px 40px rgba(8, 145, 178, 0.22)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ecfeff' }}>
        <Landmark size={22} aria-hidden />
        Efectivo inmediato / Retiro en cajero
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(34,211,238,0.2)' }}>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {inject
              ? 'El cargo total (retiro + comisión) va a la tarjeta y el efectivo retirado se suma al saldo de la cuenta que elijas. La cuota es nivelada (capital + interés).'
              : 'Solo registramos la deuda en la tarjeta y el plan de mensualidades; no se modifica el saldo de tus cuentas de efectivo (el capital ya está en tu patrimonio o ya se usó).'}
          </Typography>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#e0f2fe' }}>
              ¿Cómo se registra este dinero?
            </Typography>
            <Controller
              name="registrationMode"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={field.value}
                  onChange={(_, v) => v != null && field.onChange(v)}
                  sx={{
                    '& .MuiToggleButton-root': {
                      py: 1.25,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'rgba(34, 211, 238, 0.35)',
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(34, 211, 238, 0.22)',
                        color: '#ecfeff',
                        borderColor: 'rgba(34, 211, 238, 0.55)',
                      },
                    },
                  }}
                >
                  <ToggleButton value="INJECT_TO_ACCOUNT">Inyectar a cuenta</ToggleButton>
                  <ToggleButton value="DEBT_ONLY">Solo registro de deuda</ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>

          <FormControl fullWidth required sx={cashAdvanceGlassSelectSx}>
            <InputLabel id="ca-op-kind">Tipo de operación</InputLabel>
            <Controller
              name="operationKind"
              control={control}
              render={({ field }) => (
                <Select
                  labelId="ca-op-kind"
                  label="Tipo de operación"
                  value={field.value}
                  onChange={(e: SelectChangeEvent) => field.onChange(e.target.value)}
                >
                  <MenuItem value="IMMEDIATE_CASH_FIXED">Efectivo inmediato (tasa fija anual)</MenuItem>
                  <MenuItem value="ATM_WITHDRAWAL">Retiro de cajero (comisión + tasa diaria o anual)</MenuItem>
                </Select>
              )}
            />
          </FormControl>

          <TextField
            label="Monto retirado"
            {...(() => {
              const { onChange, ...rest } = register('withdrawnAmount');
              return {
                ...rest,
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  e.target.value = normalizeMoneyInputTyping(e.target.value);
                  void onChange(e);
                },
              };
            })()}
            fullWidth
            required
            sx={cashAdvanceGlassFieldSx}
            error={Boolean(errors.withdrawnAmount)}
            helperText={errors.withdrawnAmount?.message}
            inputProps={{ inputMode: 'decimal' }}
          />

          {opKind === 'IMMEDIATE_CASH_FIXED' ? (
            <TextField
              label="Tasa de interés anual pactada (%)"
              {...register('interestAnnualPct')}
              fullWidth
              required
              sx={cashAdvanceGlassFieldSx}
              error={Boolean(errors.interestAnnualPct)}
              helperText={errors.interestAnnualPct?.message ?? 'Ej. 45 para 45% nominal anual'}
              inputProps={{ inputMode: 'decimal' }}
            />
          ) : (
            <Stack spacing={1.5}>
              <TextField
                label="Tasa diaria (%) — opcional si indicas anual"
                {...register('dailyRatePct')}
                fullWidth
                sx={cashAdvanceGlassFieldSx}
                error={Boolean(errors.dailyRatePct)}
                helperText="Si la llenas, la cuota usa anual equivalente = diaria × 365."
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                label="O tasa anual (%) — si no usas diaria"
                {...register('interestAnnualPct')}
                fullWidth
                sx={cashAdvanceGlassFieldSx}
                inputProps={{ inputMode: 'decimal' }}
              />
            </Stack>
          )}

          <FormControl fullWidth required sx={cashAdvanceGlassSelectSx}>
            <InputLabel id="ca-term">Plazo (mensualidades)</InputLabel>
            <Controller
              name="totalInstallments"
              control={control}
              render={({ field }) => (
                <Select
                  labelId="ca-term"
                  label="Plazo (mensualidades)"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                >
                  {TERM_MONTHS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m} meses
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>

          <TextField
            label="Mensualidad inicial (contador)"
            type="number"
            {...register('initialInstallment', { valueAsNumber: true })}
            fullWidth
            required
            sx={cashAdvanceGlassFieldSx}
            error={Boolean(errors.initialInstallment)}
            helperText={
              errors.initialInstallment?.message ??
              `Si ya vas en el mes 3 de ${nInst}, indica 3. Vi seguirá desde ahí al cerrar estados de cuenta.`
            }
            inputProps={{ min: 1, max: nInst, inputMode: 'numeric' }}
          />

          <TextField
            label="Comisión de disposición (opcional)"
            {...(() => {
              const { onChange, ...rest } = register('dispositionFee');
              return {
                ...rest,
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  e.target.value = normalizeMoneyInputTyping(e.target.value);
                  void onChange(e);
                },
              };
            })()}
            fullWidth
            sx={cashAdvanceGlassFieldSx}
            helperText="Se suma al cargo de la tarjeta (no al efectivo que recibes)."
            inputProps={{ inputMode: 'decimal' }}
          />

          <FormControl fullWidth required sx={cashAdvanceGlassSelectSx}>
            <InputLabel id="ca-card">Tarjeta (cargo)</InputLabel>
            <Controller
              name="creditAccountId"
              control={control}
              render={({ field }) => (
                <Select
                  labelId="ca-card"
                  label="Tarjeta (cargo)"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={creditCards.length === 0}
                >
                  {creditCards.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <AccountGlyph type={a.type} />
                        {a.name}
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>

          {inject ? (
            <FormControl fullWidth required sx={cashAdvanceGlassSelectSx} error={Boolean(errors.cashAccountId)}>
              <InputLabel id="ca-cash">Cuenta donde recibes el efectivo</InputLabel>
              <Controller
                name="cashAccountId"
                control={control}
                render={({ field }) => (
                  <Select
                    labelId="ca-cash"
                    label="Cuenta donde recibes el efectivo"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={cashAccounts.length === 0}
                  >
                    {cashAccounts.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <AccountGlyph type={a.type} />
                          {a.name}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.cashAccountId ? (
                <FormHelperText>{errors.cashAccountId.message}</FormHelperText>
              ) : null}
            </FormControl>
          ) : null}

          <FormControl fullWidth required sx={cashAdvanceGlassSelectSx}>
            <InputLabel id="ca-exp-cat">Categoría (gasto en tarjeta)</InputLabel>
            <Controller
              name="expenseCategoryId"
              control={control}
              render={({ field }) => (
                <Select
                  labelId="ca-exp-cat"
                  label="Categoría (gasto en tarjeta)"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {expenseCats.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>

          {inject ? (
            <FormControl fullWidth required sx={cashAdvanceGlassSelectSx} error={Boolean(errors.incomeCategoryId)}>
              <InputLabel id="ca-inc-cat">Categoría (ingreso en efectivo)</InputLabel>
              <Controller
                name="incomeCategoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    labelId="ca-inc-cat"
                    label="Categoría (ingreso en efectivo)"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {incomeCats.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.incomeCategoryId ? (
                <FormHelperText>{errors.incomeCategoryId.message}</FormHelperText>
              ) : null}
            </FormControl>
          ) : null}

          <TextField
            label="Concepto (opcional)"
            {...register('concept')}
            fullWidth
            sx={cashAdvanceGlassFieldSx}
          />
          <TextField
            label="Notas (opcional)"
            {...register('notes')}
            fullWidth
            multiline
            minRows={2}
            sx={cashAdvanceGlassFieldSx}
          />

          {preview ? (
            <Box
              sx={{
                borderRadius: 2,
                p: 1.75,
                border: '1px solid rgba(34, 211, 238, 0.35)',
                bgcolor: 'rgba(34, 211, 238, 0.08)',
              }}
            >
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#a5f3fc', mb: 0.5 }}>
                Vista previa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cargo en tarjeta (aprox.):{' '}
                <strong>{formatMoney(String(preview.principal), cur)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pago mensual estimado:{' '}
                <strong>{formatMoney(String(preview.monthly.toFixed(2)), cur)}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Contador: mes {initialInst} de {nInst} al registrar (luego avanza con cada corte de la tarjeta).
              </Typography>
            </Box>
          ) : null}

        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting} color="inherit">
          Cerrar
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit(onSubmit)()}
          disabled={
            isSubmitting ||
            creditCards.length === 0 ||
            expenseCats.length === 0 ||
            (inject && (cashAccounts.length === 0 || incomeCats.length === 0))
          }
          sx={{
            bgcolor: 'rgba(34, 211, 238, 0.25)',
            color: '#ecfeff',
            border: '1px solid rgba(34, 211, 238, 0.5)',
            '&:hover': { bgcolor: 'rgba(34, 211, 238, 0.4)' },
          }}
        >
          {isSubmitting ? 'Guardando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
