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
