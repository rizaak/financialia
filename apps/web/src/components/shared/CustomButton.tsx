import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Button, type ButtonProps } from '@mui/material';
import type { ReactNode } from 'react';

export type OperationVariant = 'expense' | 'income' | 'transfer';

export type CustomButtonProps = Omit<ButtonProps, 'color' | 'variant'> & {
  /** Gasto (carmesí), Ingreso (esmeralda), Transferencia (info). */
  operationVariant: OperationVariant;
  variant?: ButtonProps['variant'];
};

const iconByOp: Record<OperationVariant, ReactNode> = {
  expense: <RemoveCircleOutlineIcon fontSize="small" />,
  income: <AddCircleOutlineIcon fontSize="small" />,
  transfer: <SwapHorizIcon fontSize="small" />,
};

const expenseSx = {
  border: '1px solid rgba(244, 63, 94, 0.45)',
  background: 'linear-gradient(145deg, rgba(244,63,94,0.18) 0%, rgba(190,18,60,0.1) 100%)',
  color: '#fecdd3',
  boxShadow: '0 0 22px rgba(244, 63, 94, 0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
  '&:hover': {
    borderColor: 'rgba(244, 63, 94, 0.75)',
    background: 'linear-gradient(145deg, rgba(244,63,94,0.28) 0%, rgba(190,18,60,0.16) 100%)',
    boxShadow: '0 0 32px rgba(244, 63, 94, 0.42)',
  },
};

const incomeSx = {
  border: '1px solid rgba(16, 185, 129, 0.45)',
  background: 'linear-gradient(145deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.12) 100%)',
  color: '#a7f3d0',
  boxShadow: '0 0 22px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
  '&:hover': {
    borderColor: 'rgba(16, 185, 129, 0.8)',
    background: 'linear-gradient(145deg, rgba(16,185,129,0.28) 0%, rgba(5,150,105,0.18) 100%)',
    boxShadow: '0 0 32px rgba(16, 185, 129, 0.38)',
  },
};

const transferSx = {
  border: '1px solid rgba(56, 189, 248, 0.4)',
  background: 'linear-gradient(145deg, rgba(56,189,248,0.14) 0%, rgba(37,99,235,0.1) 100%)',
  color: '#bae6fd',
  boxShadow: '0 0 20px rgba(56, 189, 248, 0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
  '&:hover': {
    borderColor: 'rgba(56, 189, 248, 0.7)',
    background: 'linear-gradient(145deg, rgba(56,189,248,0.22) 0%, rgba(37,99,235,0.14) 100%)',
    boxShadow: '0 0 28px rgba(56, 189, 248, 0.35)',
  },
};

const sxByOp: Record<OperationVariant, object> = {
  expense: expenseSx,
  income: incomeSx,
  transfer: transferSx,
};

/**
 * Botón con bordes luminosos y gradientes sutiles (gasto / ingreso / transferencia).
 */
export function CustomButton({
  operationVariant,
  variant = 'outlined',
  startIcon,
  sx,
  ...rest
}: CustomButtonProps) {
  return (
    <Button
      variant={variant}
      color="inherit"
      startIcon={startIcon ?? iconByOp[operationVariant]}
      sx={{
        transition: 'box-shadow 0.2s ease, transform 0.15s ease, border-color 0.2s ease',
        fontWeight: 700,
        ...sxByOp[operationVariant],
        ...sx,
      }}
      {...rest}
    />
  );
}
