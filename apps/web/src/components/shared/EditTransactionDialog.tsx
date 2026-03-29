import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
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
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AccountRow } from '../../api/fetchAccounts';
import type { CategoryRow } from '../../api/categoryTypes';
import {
  patchTransaction,
  type TransactionWithCategory,
  type UpdateTransactionPayload,
} from '../../api/fetchTransactions';
import { formatMoney } from '../../lib/formatMoney';
import { localDateInputToIsoMidday } from '../../lib/localCalendarRange';
import { useFinanceStore } from '../../stores/financeStore';

export type EditTransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  transaction: TransactionWithCategory | null;
  getAccessToken: () => Promise<string>;
  accounts: AccountRow[];
  categories: CategoryRow[];
  defaultCurrency: string;
  onSaved: () => void | Promise<void>;
};

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
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

function useEditTxSchema(hasMsi: boolean) {
  return useMemo(
    () =>
      z
        .object({
          accountId: z.string().uuid(),
          categoryId: z.string().uuid(),
          amount: z.number().positive(),
          concept: z.string().min(1).max(500),
          notes: z.string(),
          occurredAt: z.string().min(1),
          totalInstallments: z.number().int().min(2).max(60).optional(),
        })
        .superRefine((data, ctx) => {
          if (hasMsi && (data.totalInstallments == null || data.totalInstallments < 2)) {
            ctx.addIssue({
              code: 'custom',
              path: ['totalInstallments'],
              message: 'Indica entre 2 y 60 meses.',
            });
          }
        }),
    [hasMsi],
  );
}

export function EditTransactionDialog({
  open,
  onClose,
  transaction,
  getAccessToken,
  accounts,
  categories,
  defaultCurrency,
  onSaved,
}: EditTransactionDialogProps) {
  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const inCurrency = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur && a.status !== 'ARCHIVED'),
    [accounts, cur],
  );

  const hasMsi = Boolean(transaction?.installmentPlan);
  const txKind = transaction?.type ?? 'EXPENSE';

  const catOptions = useMemo(() => {
    if (!transaction) return [];
    if (transaction.type === 'ADJUSTMENT') {
      return categories.filter((c) => c.kind === 'ADJUSTMENT');
    }
    return categories.filter((c) => c.kind === transaction.type);
  }, [categories, transaction]);

  const schema = useEditTxSchema(hasMsi);

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      accountId: '',
      categoryId: '',
      amount: 0,
      concept: '',
      notes: '',
      occurredAt: '',
      totalInstallments: 2,
    },
  });

  const { control, handleSubmit, reset, formState: { errors, isValid } } = form;

  useEffect(() => {
    if (!open || !transaction) return;
    reset({
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      amount: Number(transaction.amount),
      concept: transaction.concept,
      notes: transaction.notes ?? '',
      occurredAt: isoToDateInput(transaction.occurredAt),
      totalInstallments: transaction.installmentPlan?.totalInstallments ?? 2,
    });
    setSubmitError(null);
  }, [open, transaction, reset]);

  async function onSubmit(values: {
    accountId: string;
    categoryId: string;
    amount: number;
    concept: string;
    notes: string;
    occurredAt: string;
    totalInstallments?: number;
  }) {
    if (!transaction) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: UpdateTransactionPayload = {
        accountId: values.accountId,
        categoryId: values.categoryId,
        type: transaction.type,
        amount: values.amount,
        concept: values.concept.trim(),
        notes: values.notes?.trim() || null,
        occurredAt: localDateInputToIsoMidday(values.occurredAt),
      };
      if (hasMsi && transaction.installmentPlan) {
        body.totalInstallments = values.totalInstallments;
      }
      await patchTransaction(getAccessToken, transaction.id, body);
      await refreshBalancesAfterMutation(getAccessToken);
      await onSaved();
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!transaction) return null;

  return (
    <>
      <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth="sm">
        <DialogTitle>Editar transacción</DialogTitle>
        <DialogContent dividers>
          <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
            {transaction.type === 'ADJUSTMENT' ? (
              <Alert severity="info" variant="outlined">
                Estás editando un ajuste de saldo. Los cambios recalculan el saldo de la cuenta.
              </Alert>
            ) : null}
            {hasMsi ? (
              <Alert severity="info" variant="outlined">
                Compra a meses: al cambiar el monto o los meses se recalcula la cuota mensual del plan.
              </Alert>
            ) : null}
            {submitError ? (
              <Alert severity="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            ) : null}
            <Controller
              name="accountId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={inCurrency}
                  getOptionLabel={(o) => o.name}
                  value={inCurrency.find((a) => a.id === field.value) ?? null}
                  onChange={(_, v) => field.onChange(v?.id ?? '')}
                  disabled={submitting}
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
                      label="Cuenta"
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
                <FormControl fullWidth error={Boolean(errors.categoryId)}>
                  <InputLabel id="edit-cat-label">Categoría</InputLabel>
                  <Select labelId="edit-cat-label" label="Categoría" {...field} disabled={submitting}>
                    {catOptions.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  inputProps={{ step: '0.01', min: 0 }}
                  label={txKind === 'ADJUSTMENT' ? 'Monto del ajuste (valor absoluto)' : 'Monto'}
                  error={Boolean(errors.amount)}
                  helperText={errors.amount?.message}
                  fullWidth
                  disabled={submitting}
                  value={Number.isFinite(field.value) ? field.value : ''}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    field.onChange(Number.isFinite(n) ? n : 0);
                  }}
                />
              )}
            />
            {hasMsi ? (
              <Controller
                name="totalInstallments"
                control={control}
                render={({ field }) => (
                  <TextField
                    type="number"
                    inputProps={{ min: 2, max: 60 }}
                    label="Meses del plan (MSI)"
                    fullWidth
                    disabled={submitting}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 2)}
                    error={Boolean(errors.totalInstallments)}
                    helperText={errors.totalInstallments?.message}
                  />
                )}
              />
            ) : null}
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
                  disabled={submitting}
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Notas (opcional)" fullWidth disabled={submitting} />
              )}
            />
            <Controller
              name="occurredAt"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Fecha"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  disabled={submitting}
                />
              )}
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1 }}>
              <Button onClick={onClose} disabled={submitting} color="inherit">
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={!isValid || submitting}>
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
