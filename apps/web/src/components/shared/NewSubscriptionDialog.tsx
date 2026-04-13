import AddTaskIcon from '@mui/icons-material/AddTask';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Banknote, Building2, CreditCard, Wallet } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { AccountRow } from '../../api/fetchAccounts';
import type { CategoryRow } from '../../api/categoryTypes';
import { createRecurringExpense } from '../../api/fetchRecurringExpenses';
import { useTransaction } from '../../hooks/useTransaction';
import { formatMoney } from '../../lib/formatMoney';
import { normalizeMoneyInputTyping, parseMoneyInput } from '../../lib/parseMoneyInput';
import { VI_SUCCESS_SUBSCRIPTION_REGISTERED } from '../../config/brandConfig';
import {
  buildSubscriptionFormSchema,
  type SubscriptionFormValues,
} from '../../lib/transactionDialogSchemas';
import { formGlassFieldSx, formGlassOutlinedInputRoot, formGlassSelectSx } from './formGlassSx';

export type NewSubscriptionDialogProps = {
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

function defaultBillingDay(): number {
  const d = new Date().getDate();
  return Math.min(31, Math.max(1, d));
}

/**
 * Alta de suscripción recurrente: frecuencia de pago y día de cargo.
 */
export function NewSubscriptionDialog({
  open,
  onClose,
  getAccessToken,
  categories,
  accounts,
  defaultCurrency,
  onSaved,
}: NewSubscriptionDialogProps) {
  const { run } = useTransaction();
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const inCurrency = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur),
    [accounts, cur],
  );
  const schema = useMemo(() => buildSubscriptionFormSchema(), []);
  const expenseCats = useMemo(
    () => [...categories.filter((c) => c.kind === 'EXPENSE')].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      accountId: '',
      categoryId: '',
      amount: '',
      billingDay: defaultBillingDay(),
      frequency: 'MONTHLY',
      billingMonth: new Date().getMonth() + 1,
      billingWeekday: 1,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = form;

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    reset({
      name: '',
      accountId: '',
      categoryId: '',
      amount: '',
      billingDay: defaultBillingDay(),
      frequency: 'MONTHLY',
      billingMonth: d.getMonth() + 1,
      billingWeekday: 1,
    });
  }, [open, reset]);

  const frequency = watch('frequency');

  async function onSubmit(values: SubscriptionFormValues) {
    const needsDayInMonth = ['MONTHLY', 'ANNUAL', 'SEMIANNUAL'].includes(values.frequency);
    const billingDay =
      needsDayInMonth ? values.billingDay : 1;
    const amountNum = parseMoneyInput(values.amount);
    const result = await run(
      () =>
        createRecurringExpense(getAccessToken, {
          name: values.name.trim(),
          amount: amountNum,
          billingDay,
          frequency: values.frequency,
          billingMonth:
            values.frequency === 'ANNUAL' || values.frequency === 'SEMIANNUAL'
              ? values.billingMonth
              : undefined,
          billingWeekday: values.frequency === 'WEEKLY' ? values.billingWeekday : undefined,
          categoryId: values.categoryId,
          accountId: values.accountId,
        }),
      {
        loadingMessage: 'Creando suscripción…',
        successMessage: VI_SUCCESS_SUBSCRIPTION_REGISTERED,
        successDescription: values.name.trim(),
      },
    );
    if (result !== undefined) {
      await onSaved();
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          className: 'backdrop-blur-md bg-black/35 dark:bg-black/50',
          sx: { backdropFilter: 'blur(12px)' },
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          maxWidth: 500,
          width: '100%',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="h2" fontWeight={700}>
          Nueva suscripción
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Cargo recurrente: frecuencia (diaria a anual), día del mes o día de la semana según aplique.
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          pt: 2,
          maxHeight: 'min(70vh, 640px)',
          overflowY: 'auto',
        }}
      >
        <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre (ej. Netflix)"
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                fullWidth
                sx={formGlassFieldSx}
              />
            )}
          />

          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={inCurrency}
                getOptionLabel={(o) => o.name}
                value={inCurrency.find((a) => a.id === field.value) ?? null}
                onChange={(_, v) => field.onChange(v?.id ?? '')}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <AccountGlyph type={option.type} />
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.type === 'CREDIT_CARD'
                            ? `Deuda ${formatMoney(option.balance, option.currency)}`
                            : formatMoney(option.balance, option.currency)}
                        </Typography>
                      </Box>
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cuenta de cargo"
                    error={Boolean(errors.accountId)}
                    helperText={errors.accountId?.message}
                    sx={formGlassFieldSx}
                  />
                )}
              />
            )}
          />

          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={expenseCats}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={expenseCats.find((c) => c.id === field.value) ?? null}
                onChange={(_, v) => field.onChange(v?.id ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Categoría de gasto"
                    error={Boolean(errors.categoryId)}
                    helperText={errors.categoryId?.message}
                    sx={formGlassFieldSx}
                  />
                )}
              />
            )}
          />

          <Controller
            name="amount"
            control={control}
            render={({ field }) => {
              const hasErr = Boolean(errors.amount);
              const amtStr = typeof field.value === 'string' ? field.value : '';
              const hasTyping = amtStr.trim().length > 0;
              return (
                <TextField
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  label="Monto por periodo"
                  placeholder="$0.00"
                  error={hasErr}
                  helperText={errors.amount?.message}
                  fullWidth
                  value={amtStr}
                  onChange={(e) => field.onChange(normalizeMoneyInputTyping(e.target.value))}
                  onFocus={(e) => {
                    const el = e.target as HTMLInputElement;
                    if (el.value === '') {
                      requestAnimationFrame(() => el.setSelectionRange(0, 0));
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      ...formGlassOutlinedInputRoot,
                      ...(hasTyping && !hasErr
                        ? {
                            '& fieldset': { borderColor: 'rgba(59, 130, 246, 0.55)' },
                            '&:hover:not(.Mui-error):not(.Mui-focused) fieldset': {
                              borderColor: 'rgba(59, 130, 246, 0.45)',
                            },
                          }
                        : {}),
                    },
                    '& .MuiInputLabel-root': { color: 'text.secondary' },
                  }}
                />
              );
            }}
          />

          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={Boolean(errors.frequency)} sx={formGlassSelectSx}>
                <InputLabel id="sub-freq-label">Frecuencia de pago</InputLabel>
                <Select labelId="sub-freq-label" label="Frecuencia de pago" {...field}>
                  <MenuItem value="DAILY">Diaria</MenuItem>
                  <MenuItem value="WEEKLY">Semanal</MenuItem>
                  <MenuItem value="QUINCENAL">Quincenal (15 y fin de mes)</MenuItem>
                  <MenuItem value="MONTHLY">Mensual</MenuItem>
                  <MenuItem value="SEMIANNUAL">Semestral</MenuItem>
                  <MenuItem value="ANNUAL">Anual</MenuItem>
                </Select>
                {errors.frequency ? (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.frequency.message}
                  </Typography>
                ) : null}
              </FormControl>
            )}
          />

          {frequency === 'QUINCENAL' ? (
            <Typography variant="caption" color="text.secondary">
              Se programan dos cargos por mes: día 15 y último día del mes (mismo monto cada vez).
            </Typography>
          ) : null}
          {frequency === 'DAILY' ? (
            <Typography variant="caption" color="text.secondary">
              Un cargo cada día civil con el monto indicado.
            </Typography>
          ) : null}

          {['MONTHLY', 'ANNUAL', 'SEMIANNUAL'].includes(frequency) ? (
            <Controller
              name="billingDay"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  inputProps={{ step: 1, min: 1, max: 31 }}
                  label="Día de cargo en el mes (1–31)"
                  error={Boolean(errors.billingDay)}
                  helperText={errors.billingDay?.message}
                  fullWidth
                  sx={formGlassFieldSx}
                  value={Number.isFinite(field.value) ? field.value : ''}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    field.onChange(Number.isFinite(n) ? n : 0);
                  }}
                />
              )}
            />
          ) : null}

          {frequency === 'WEEKLY' ? (
            <Controller
              name="billingWeekday"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.billingWeekday)} sx={formGlassSelectSx}>
                  <InputLabel id="sub-wd-label">Día de la semana del cargo</InputLabel>
                  <Select
                    labelId="sub-wd-label"
                    label="Día de la semana del cargo"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(
                      (label, i) => (
                        <MenuItem key={label} value={i}>
                          {label}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                  {errors.billingWeekday ? (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.billingWeekday.message}
                    </Typography>
                  ) : null}
                </FormControl>
              )}
            />
          ) : null}

          {frequency === 'ANNUAL' || frequency === 'SEMIANNUAL' ? (
            <Controller
              name="billingMonth"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.billingMonth)} sx={formGlassSelectSx}>
                  <InputLabel id="sub-month-label">
                    {frequency === 'SEMIANNUAL' ? 'Mes de referencia (cada 6 meses)' : 'Mes del cobro anual'}
                  </InputLabel>
                  <Select
                    labelId="sub-month-label"
                    label={
                      frequency === 'SEMIANNUAL' ? 'Mes de referencia (cada 6 meses)' : 'Mes del cobro anual'
                    }
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {[
                      'Enero',
                      'Febrero',
                      'Marzo',
                      'Abril',
                      'Mayo',
                      'Junio',
                      'Julio',
                      'Agosto',
                      'Septiembre',
                      'Octubre',
                      'Noviembre',
                      'Diciembre',
                    ].map((label, i) => (
                      <MenuItem key={label} value={i + 1}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.billingMonth ? (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.billingMonth.message}
                    </Typography>
                  ) : null}
                </FormControl>
              )}
            />
          ) : null}

          <Stack direction="row" justifyContent="flex-end" spacing={1} alignItems="center" sx={{ pt: 1 }}>
            <Button
              type="button"
              onClick={() =>
                reset({
                  name: '',
                  accountId: '',
                  categoryId: '',
                  amount: '',
                  billingDay: defaultBillingDay(),
                  frequency: 'MONTHLY',
                  billingMonth: new Date().getMonth() + 1,
                  billingWeekday: 1,
                })
              }
              color="inherit"
              variant="text"
              size="small"
              sx={{ fontWeight: 500, color: 'text.secondary', textTransform: 'none', minWidth: 'auto' }}
            >
              Limpiar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!isValid || isSubmitting}
              startIcon={<AddTaskIcon />}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                px: 2.5,
                background: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.45)',
                '&:hover': {
                  background: 'linear-gradient(145deg, #60a5fa 0%, #3b82f6 100%)',
                  boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
                },
                '&.Mui-disabled': {
                  background: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              Registrar suscripción
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.selected' : 'grey.50'),
          borderTop: 1,
          borderColor: 'divider',
          justifyContent: 'flex-start',
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          variant="text"
          sx={{ textTransform: 'none', fontWeight: 500, color: 'text.secondary' }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
