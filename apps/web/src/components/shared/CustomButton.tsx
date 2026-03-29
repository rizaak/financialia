import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Button, type ButtonProps } from '@mui/material';
import type { ReactNode } from 'react';

export type OperationVariant = 'expense' | 'income' | 'transfer';

export type CustomButtonProps = Omit<ButtonProps, 'color' | 'variant'> & {
  /** Gasto (rojo), Ingreso (verde), Transferencia (azul / info). */
  operationVariant: OperationVariant;
  variant?: ButtonProps['variant'];
};

const colorByOp: Record<OperationVariant, ButtonProps['color']> = {
  expense: 'error',
  income: 'success',
  transfer: 'info',
};

const iconByOp: Record<OperationVariant, ReactNode> = {
  expense: <RemoveCircleOutlineIcon fontSize="small" />,
  income: <AddCircleOutlineIcon fontSize="small" />,
  transfer: <SwapHorizIcon fontSize="small" />,
};

/**
 * Botón MUI con variantes semánticas para operaciones financieras.
 */
export function CustomButton({
  operationVariant,
  variant = 'contained',
  startIcon,
  sx,
  ...rest
}: CustomButtonProps) {
  return (
    <Button
      color={colorByOp[operationVariant]}
      variant={variant}
      startIcon={startIcon ?? iconByOp[operationVariant]}
      sx={{
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)',
        },
        ...sx,
      }}
      {...rest}
    />
  );
}
