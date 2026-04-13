import type { SxProps, Theme } from '@mui/material/styles';

/** Raíz OutlinedInput reutilizable (cristal + foco azul). */
export const formGlassOutlinedInputRoot = {
  bgcolor: 'rgba(255, 255, 255, 0.05)',
  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
  '&.Mui-focused:not(.Mui-error) fieldset': {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.35)',
  },
} as const;

/** Inputs tipo cristal Vidya + resplandor azul al foco. */
export const formGlassFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': { ...formGlassOutlinedInputRoot },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
};

export const formGlassSelectSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': { ...formGlassOutlinedInputRoot },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
  '& .MuiSvgIcon-root': { color: 'text.secondary' },
};

const cashAdvanceInputRoot = {
  bgcolor: 'rgba(34, 211, 238, 0.07)',
  '& fieldset': { borderColor: 'rgba(34, 211, 238, 0.22)' },
  '&:hover fieldset': { borderColor: 'rgba(34, 211, 238, 0.35)' },
  '&.Mui-focused:not(.Mui-error) fieldset': {
    borderColor: '#22d3ee',
    boxShadow: '0 0 0 1px rgba(34, 211, 238, 0.4)',
  },
} as const;

/** Cristal con acento cian para disposiciones de efectivo / cajero. */
export const cashAdvanceGlassFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': { ...cashAdvanceInputRoot },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
};

export const cashAdvanceGlassSelectSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': { ...cashAdvanceInputRoot },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
  '& .MuiSvgIcon-root': { color: 'text.secondary' },
};
