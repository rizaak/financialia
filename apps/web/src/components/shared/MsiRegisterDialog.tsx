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
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { AccountRow } from '../../api/fetchAccounts';
import type { CategoryRow } from '../../api/categoryTypes';
import { useTransactions } from '../../hooks/useTransactions';
import { formatMoney } from '../../lib/formatMoney';
import { localDateInputToIsoMidday } from '../../lib/localCalendarRange';
import {
  buildMsiExpenseSchema,
  type MsiExpenseFormValues,
} from '../../lib/transactionDialogSchemas';
import { CustomButton } from './CustomButton';

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
      amount: 0,
      concept: '',
      notes: '',
      occurredAt: todayInputDate(),
      totalInstallments: 12,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = form;

  async function onSubmit(values: MsiExpenseFormValues) {
    const acc = creditCards.find((a) => a.id === values.accountId);
    const result = await postTransaction(
      {
        accountId: values.accountId,
        categoryId: values.categoryId,
        type: 'EXPENSE',
        amount: values.amount,
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
        successMessage: `✅ MSI registrado (${values.totalInstallments} meses)`,
        successDescription: acc ? `${acc.name} · ${values.concept.trim()}` : values.concept.trim(),
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
              />
            )}
          />

          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <TextField
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                label="Monto total de la compra"
                error={Boolean(errors.amount)}
                helperText={errors.amount?.message}
                fullWidth
                value={Number.isFinite(field.value) ? field.value : ''}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  field.onChange(Number.isFinite(n) ? n : 0);
                }}
              />
            )}
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
              />
            )}
          />
          <Controller
            name="notes"
            control={control}
            render={({ field }) => <TextField {...field} label="Notas (opcional)" fullWidth />}
          />
          <Controller
            name="occurredAt"
            control={control}
            render={({ field }) => (
              <TextField {...field} type="date" label="Fecha de compra" InputLabelProps={{ shrink: true }} fullWidth />
            )}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1 }}>
            <Button type="button" onClick={() => form.reset()} color="inherit">
              Limpiar
            </Button>
            <CustomButton type="submit" operationVariant="expense" disabled={!isValid || isSubmitting}>
              Registrar MSI
            </CustomButton>
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
        }}
      >
        <Button onClick={onClose} color="inherit" fullWidth variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
