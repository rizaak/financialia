import CheckIcon from '@mui/icons-material/Check';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Banknote, Building2, CreditCard, Wallet } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { AccountRow } from '../../api/fetchAccounts';
import type { CategoryRow } from '../../api/categoryTypes';
import { VI_SUCCESS_MSI_REGISTERED } from '../../config/brandConfig';
import { useTransactions } from '../../hooks/useTransactions';
import { formatMoney } from '../../lib/formatMoney';
import { localDateInputToIsoMidday } from '../../lib/localCalendarRange';
import { normalizeMoneyInputTyping, parseMoneyInput } from '../../lib/parseMoneyInput';
import {
  buildMsiExpenseSchema,
  type MsiExpenseFormValues,
} from '../../lib/transactionDialogSchemas';
import { formGlassFieldSx, formGlassOutlinedInputRoot } from './formGlassSx';

export type MsiRegisterDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  categories: CategoryRow[];
  accounts: AccountRow[];
  defaultCurrency: string;
  expenseCategoryUsageOrder?: string[];
  onSaved: () => void | Promise<void>;
};

function todayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function AccountGlyph({ type }: { type: AccountRow['type'] }) {
  const c = { size: 20, strokeWidth: 2 } as const;
  if (type === 'BANK') return <Building2 {...c} />;
  if (type === 'WALLET') return <Wallet {...c} />;
  if (type === 'CREDIT_CARD') return <CreditCard {...c} />;
  return <Banknote {...c} />;
}

/**
 * Registro de compra a meses (MSI) en tarjeta: monto total y número de mensualidades.
 */
export function MsiRegisterDialog({
  open,
  onClose,
  getAccessToken,
  categories,
  accounts,
  defaultCurrency,
  expenseCategoryUsageOrder = [],
  onSaved,
}: MsiRegisterDialogProps) {
  const { postTransaction } = useTransactions(getAccessToken);
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const inCurrency = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur),
    [accounts, cur],
  );
  const creditCards = useMemo(
    () => inCurrency.filter((a) => a.type === 'CREDIT_CARD'),
    [inCurrency],
  );
  const schema = useMemo(() => buildMsiExpenseSchema(inCurrency), [inCurrency]);
  const catOptions = categories.filter((c) => c.kind === 'EXPENSE');

  const sortedCatOptions = useMemo(() => {
    if (expenseCategoryUsageOrder.length === 0) {
      return [...catOptions].sort((a, b) => a.name.localeCompare(b.name));
    }
    const rank = new Map(expenseCategoryUsageOrder.map((id, i) => [id, i]));
    return [...catOptions].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id)! : 10000;
      const rb = rank.has(b.id) ? rank.get(b.id)! : 10000;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [catOptions, expenseCategoryUsageOrder]);

  const form = useForm<MsiExpenseFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      accountId: '',
      categoryId: '',
      amount: '',
      concept: '',
      notes: '',
      occurredAt: todayInputDate(),
      totalInstallments: 12,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      accountId: '',
      categoryId: '',
      amount: '',
      concept: '',
      notes: '',
      occurredAt: todayInputDate(),
      totalInstallments: 12,
    });
  }, [open, reset]);

  async function onSubmit(values: MsiExpenseFormValues) {
    const amountNum = parseMoneyInput(values.amount);
    const acc = creditCards.find((a) => a.id === values.accountId);
    const result = await postTransaction(
      {
        accountId: values.accountId,
        categoryId: values.categoryId,
        type: 'EXPENSE',
        amount: amountNum,
        concept: values.concept.trim(),
        notes: values.notes?.trim() || undefined,
        occurredAt: localDateInputToIsoMidday(values.occurredAt),
        source: 'MANUAL',
        isInstallment: true,
        totalInstallments: values.totalInstallments,
        installmentInterestFree: true,
      },
      {
        loadingMessage: 'Registrando compra MSI…',
        successMessage: VI_SUCCESS_MSI_REGISTERED,
        successDescription: `${values.totalInstallments} meses${acc ? ` · ${acc.name}` : ''} · ${values.concept.trim()}`,
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
          Registrar MSI
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Compra a meses sin intereses en tarjeta. El monto es el total financiado; indica cuántas
          mensualidades.
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
            name="accountId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={creditCards}
                getOptionLabel={(o) => o.name}
                value={creditCards.find((a) => a.id === field.value) ?? null}
                onChange={(_, v) => field.onChange(v?.id ?? '')}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <AccountGlyph type={option.type} />
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Deuda {formatMoney(option.balance, option.currency)}
                        </Typography>
                      </Box>
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tarjeta de crédito"
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
                options={sortedCatOptions}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={sortedCatOptions.find((c) => c.id === field.value) ?? null}
                onChange={(_, v) => field.onChange(v?.id ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Categoría"
                    error={Boolean(errors.categoryId)}
                    helperText={errors.categoryId?.message}
                    sx={formGlassFieldSx}
                  />
                )}
              />
            )}
          />

          <Controller
            name="totalInstallments"
            control={control}
            render={({ field }) => (
              <TextField
                type="number"
                inputProps={{ step: 1, min: 2, max: 60 }}
                label="Número de mensualidades"
                error={Boolean(errors.totalInstallments)}
                helperText={errors.totalInstallments?.message}
                fullWidth
                value={Number.isFinite(field.value) ? field.value : ''}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  field.onChange(Number.isFinite(n) ? n : 0);
                }}
                sx={formGlassFieldSx}
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
                  label="Monto total de la compra"
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
            name="concept"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Concepto"
                error={Boolean(errors.concept)}
                helperText={errors.concept?.message}
                fullWidth
                sx={formGlassFieldSx}
              />
            )}
          />
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Notas (opcional)" fullWidth sx={formGlassFieldSx} />
            )}
          />
          <Controller
            name="occurredAt"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                label="Fecha de compra"
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={formGlassFieldSx}
              />
            )}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1} alignItems="center" sx={{ pt: 1 }}>
            <Button
              type="button"
              onClick={() =>
                reset({
                  accountId: '',
                  categoryId: '',
                  amount: '',
                  concept: '',
                  notes: '',
                  occurredAt: todayInputDate(),
                  totalInstallments: 12,
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
              startIcon={<CheckIcon />}
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
              Registrar MSI
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
