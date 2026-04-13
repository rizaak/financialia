import { zodResolver } from '@hookform/resolvers/zod';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
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
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { AccountRow } from '../../api/fetchAccounts';
import type { CategoryRow } from '../../api/categoryTypes';
import { useTransactions } from '../../hooks/useTransactions';
import { availableForExpense } from '../../lib/accountAvailableForExpense';
import { formatMoney } from '../../lib/formatMoney';
import { localDateInputToIsoMidday } from '../../lib/localCalendarRange';
import {
  VI_SUCCESS_EXPENSE_REGISTERED,
  VI_SUCCESS_INCOME_REGISTERED,
  VI_SUCCESS_MESSAGE,
} from '../../config/brandConfig';
import { normalizeMoneyInputTyping, parseMoneyInput } from '../../lib/parseMoneyInput';
import {
  buildExpenseIncomeSchema,
  buildTransferSchema,
  type ExpenseIncomeFormValues,
  type TransferFormValues,
} from '../../lib/transactionDialogSchemas';
import { CustomButton } from './CustomButton';
import {
  formGlassFieldSx,
  formGlassOutlinedInputRoot,
  formGlassSelectSx,
} from './formGlassSx';

const expensePrimaryButtonSx = {
  fontWeight: 700,
  textTransform: 'none',
  px: 2.5,
  background: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 100%)',
  color: '#fff',
  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.45)',
  '&:hover': {
    background: 'linear-gradient(145deg, #60a5fa 0%, #3b82f6 100%)',
    boxShadow: '0 8px 28px rgba(59, 130, 246, 0.55), 0 0 24px rgba(59, 130, 246, 0.35)',
  },
  '&.Mui-disabled': {
    background: 'action.disabledBackground',
    color: 'action.disabled',
  },
} as const;

export type TransactionDialogMode = 'expense' | 'income' | 'transfer';

export type TransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: TransactionDialogMode;
  getAccessToken: () => Promise<string>;
  categories: CategoryRow[];
  accounts: AccountRow[];
  defaultCurrency: string;
  /** IDs de categoría de gasto más usadas primero (p. ej. desde movimientos recientes). */
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
 * Modal centrado (mismo estilo base que la revisión IA): Gasto, Ingreso o Transferencia
 * (RHF + Zod + validación de saldo en gastos).
 */
export function TransactionDialog({
  open,
  onClose,
  mode,
  getAccessToken,
  categories,
  accounts,
  defaultCurrency,
  expenseCategoryUsageOrder = [],
  onSaved,
}: TransactionDialogProps) {
  const title =
    mode === 'expense' ? 'Registrar gasto' : mode === 'income' ? 'Registrar ingreso' : 'Transferir entre cuentas';

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
          {title}
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
        {open && mode === 'expense' ? (
          <ExpenseIncomeDialogBody
            kind="EXPENSE"
            getAccessToken={getAccessToken}
            categories={categories}
            accounts={accounts}
            defaultCurrency={defaultCurrency}
            expenseCategoryUsageOrder={expenseCategoryUsageOrder}
            onSaved={onSaved}
            onClose={onClose}
          />
        ) : null}
        {open && mode === 'income' ? (
          <ExpenseIncomeDialogBody
            kind="INCOME"
            getAccessToken={getAccessToken}
            categories={categories}
            accounts={accounts}
            defaultCurrency={defaultCurrency}
            expenseCategoryUsageOrder={[]}
            onSaved={onSaved}
            onClose={onClose}
          />
        ) : null}
        {open && mode === 'transfer' ? (
          <TransferDialogBody
            getAccessToken={getAccessToken}
            accounts={accounts}
            defaultCurrency={defaultCurrency}
            onSaved={onSaved}
            onClose={onClose}
          />
        ) : null}
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

type BodyProps = {
  getAccessToken: () => Promise<string>;
  categories: CategoryRow[];
  accounts: AccountRow[];
  defaultCurrency: string;
  expenseCategoryUsageOrder: string[];
  onSaved: () => void | Promise<void>;
  onClose: () => void;
};

function ExpenseIncomeDialogBody({
  kind,
  getAccessToken,
  categories,
  accounts,
  defaultCurrency,
  expenseCategoryUsageOrder,
  onSaved,
  onClose,
}: BodyProps & { kind: 'EXPENSE' | 'INCOME' }) {
  const { postTransaction } = useTransactions(getAccessToken);
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const inCurrency = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur),
    [accounts, cur],
  );
  const schema = useMemo(() => buildExpenseIncomeSchema(inCurrency, kind), [inCurrency, kind]);
  const catOptions = categories.filter((c) => c.kind === kind);

  const sortedCatOptions = useMemo(() => {
    if (kind !== 'EXPENSE' || expenseCategoryUsageOrder.length === 0) {
      return [...catOptions].sort((a, b) => a.name.localeCompare(b.name));
    }
    const rank = new Map(expenseCategoryUsageOrder.map((id, i) => [id, i]));
    return [...catOptions].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id)! : 10000;
      const rb = rank.has(b.id) ? rank.get(b.id)! : 10000;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [catOptions, kind, expenseCategoryUsageOrder]);

  const form = useForm<ExpenseIncomeFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      accountId: '',
      categoryId: '',
      amount: '',
      concept: '',
      notes: '',
      occurredAt: todayInputDate(),
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = form;

  const watchedAccountId = watch('accountId');
  const watchedAmountRaw = watch('amount');
  const watchedAmount = useMemo(() => {
    const s = typeof watchedAmountRaw === 'string' ? watchedAmountRaw : '';
    const n = parseMoneyInput(s);
    return Number.isFinite(n) ? n : NaN;
  }, [watchedAmountRaw]);
  const selectedAccount = useMemo(
    () => inCurrency.find((a) => a.id === watchedAccountId),
    [inCurrency, watchedAccountId],
  );
  const available = selectedAccount ? availableForExpense(selectedAccount) : 0;
  const insufficientFunds =
    kind === 'EXPENSE' &&
    selectedAccount &&
    Number.isFinite(watchedAmount) &&
    watchedAmount > 0 &&
    watchedAmount > available;

  async function onSubmit(values: ExpenseIncomeFormValues) {
    const acc = inCurrency.find((a) => a.id === values.accountId);
    const amountNum = parseMoneyInput(values.amount);
    const result = await postTransaction(
      {
        accountId: values.accountId,
        categoryId: values.categoryId,
        type: kind,
        amount: amountNum,
        concept: values.concept.trim(),
        notes: values.notes?.trim() || undefined,
        occurredAt: localDateInputToIsoMidday(values.occurredAt),
        source: 'MANUAL',
      },
      {
        loadingMessage: kind === 'EXPENSE' ? 'Guardando gasto…' : 'Guardando ingreso…',
        successMessage:
          kind === 'EXPENSE' ? VI_SUCCESS_EXPENSE_REGISTERED : VI_SUCCESS_INCOME_REGISTERED,
        successDescription:
          kind === 'EXPENSE'
            ? `${values.concept.trim()} · ${acc?.name ?? 'cuenta'}`
            : `${values.concept.trim()} · ${acc?.name ?? 'cuenta'}`,
      },
    );
    if (result !== undefined) {
      await onSaved();
      onClose();
    }
  }

  const availableLabel =
    selectedAccount && Number.isFinite(available) && available !== Number.POSITIVE_INFINITY
      ? formatMoney(String(available), selectedAccount.currency)
      : '';

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
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
                label={kind === 'EXPENSE' ? 'Cuenta de origen' : 'Cuenta'}
                error={Boolean(errors.accountId)}
                helperText={errors.accountId?.message}
                sx={formGlassFieldSx}
              />
            )}
          />
        )}
      />

      {kind === 'EXPENSE' ? (
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
      ) : (
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(errors.categoryId)} sx={formGlassSelectSx}>
              <InputLabel id="cat-label">Categoría</InputLabel>
              <Select labelId="cat-label" label="Categoría" {...field}>
                {sortedCatOptions.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.categoryId ? (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.categoryId.message}
                </Typography>
              ) : null}
            </FormControl>
          )}
        />
      )}

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
              label="Monto"
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
      {kind === 'EXPENSE' && insufficientFunds && selectedAccount ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: -0.5 }}>
          Excede el saldo disponible ({availableLabel})
        </Typography>
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
            label="Fecha"
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
            form.reset({
              accountId: '',
              categoryId: '',
              amount: '',
              concept: '',
              notes: '',
              occurredAt: todayInputDate(),
            })
          }
          color="inherit"
          variant="text"
          size="small"
          sx={{ fontWeight: 500, color: 'text.secondary', textTransform: 'none', minWidth: 'auto' }}
        >
          Limpiar
        </Button>
        {kind === 'EXPENSE' ? (
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || isSubmitting || insufficientFunds}
            startIcon={<ReceiptLongIcon />}
            sx={expensePrimaryButtonSx}
          >
            Registrar gasto
          </Button>
        ) : (
          <CustomButton type="submit" operationVariant="income" disabled={!isValid || isSubmitting}>
            Registrar ingreso
          </CustomButton>
        )}
      </Stack>
    </Stack>
  );
}

function TransferDialogBody({
  getAccessToken,
  accounts,
  defaultCurrency,
  onSaved,
  onClose,
}: Omit<BodyProps, 'categories' | 'expenseCategoryUsageOrder'>) {
  const { postTransfer } = useTransactions(getAccessToken);
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const inCurrency = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur),
    [accounts, cur],
  );
  const schema = useMemo(() => buildTransferSchema(inCurrency), [inCurrency]);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      fee: 0,
      notes: '',
      occurredAt: todayInputDate(),
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = form;
  const fromId = watch('fromAccountId');
  const destOptions = useMemo(
    () => inCurrency.filter((a) => !fromId || a.id !== fromId),
    [inCurrency, fromId],
  );

  async function onSubmit(values: TransferFormValues) {
    const from = inCurrency.find((a) => a.id === values.fromAccountId);
    const to = inCurrency.find((a) => a.id === values.toAccountId);
    const amtLabel = formatMoney(values.amount, cur);
    const result = await postTransfer(
      {
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amount: values.amount,
        fee: values.fee && values.fee > 0 ? values.fee : undefined,
        notes: values.notes?.trim() || undefined,
        occurredAt: localDateInputToIsoMidday(values.occurredAt),
      },
      {
        loadingMessage: 'Procesando transferencia…',
        successMessage: VI_SUCCESS_MESSAGE,
        successDescription:
          from && to
            ? `Transferencia de ${amtLabel}: ${from.name} → ${to.name}`
            : `Transferencia de ${amtLabel} realizada correctamente.`,
      },
    );
    if (result !== undefined) {
      await onSaved();
      onClose();
    }
  }

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Controller
        name="fromAccountId"
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
                label="Desde"
                error={Boolean(errors.fromAccountId)}
                sx={formGlassFieldSx}
              />
            )}
          />
        )}
      />
      <Controller
        name="toAccountId"
        control={control}
        render={({ field }) => (
          <Autocomplete
            options={destOptions}
            getOptionLabel={(o) => o.name}
            value={destOptions.find((a) => a.id === field.value) ?? null}
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
                label="Hacia"
                error={Boolean(errors.toAccountId)}
                sx={formGlassFieldSx}
              />
            )}
          />
        )}
      />
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <TextField
            type="number"
            inputProps={{ step: '0.01', min: 0, inputMode: 'decimal' }}
            label="Monto"
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            fullWidth
            value={field.value > 0 ? field.value : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                field.onChange(0);
                return;
              }
              const n = parseFloat(normalizeMoneyInputTyping(raw));
              field.onChange(Number.isFinite(n) ? n : 0);
            }}
            sx={formGlassFieldSx}
          />
        )}
      />
      <Controller
        name="fee"
        control={control}
        render={({ field }) => (
          <TextField
            type="number"
            inputProps={{ step: '0.01', min: 0, inputMode: 'decimal' }}
            label="Comisión (opcional)"
            placeholder="$0.00"
            fullWidth
            value={(field.value ?? 0) > 0 ? field.value : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                field.onChange(0);
                return;
              }
              const n = parseFloat(normalizeMoneyInputTyping(raw));
              field.onChange(Number.isFinite(n) ? n : 0);
            }}
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
            label="Fecha"
            InputLabelProps={{ shrink: true }}
            fullWidth
            sx={formGlassFieldSx}
          />
        )}
      />
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1 }}>
        <Button
          type="button"
          onClick={() => form.reset()}
          color="inherit"
          variant="text"
          size="small"
          sx={{ fontWeight: 500, color: 'text.secondary', textTransform: 'none', minWidth: 'auto' }}
        >
          Limpiar
        </Button>
        <CustomButton type="submit" operationVariant="transfer" disabled={!isValid || isSubmitting}>
          Transferir
        </CustomButton>
      </Stack>
    </Stack>
  );
}
