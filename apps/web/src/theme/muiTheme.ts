import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

const glassBg = 'rgba(255, 255, 255, 0.03)';
/** Borde estándar Vantix (glass oscuro). */
const glassBorder = '1px solid rgba(255, 255, 255, 0.1)';
const electric = '#38bdf8';
const purple = '#a78bfa';
const labelMuted = '#94a3b8';
/** Texto de cuerpo (legible sobre fondo oscuro). */
const bodyText = '#E2E8F0';
const focusBlue = '#3b82f6';

/** Tema oscuro tipo landing: cristal, gradiente de página, montos en blanco, etiquetas slate. */
export const appMuiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: electric,
      dark: '#0ea5e9',
      light: '#7dd3fc',
      contrastText: '#020617',
    },
    secondary: { main: purple, contrastText: '#ffffff' },
    error: { main: '#e11d48' },
    warning: { main: '#fbbf24' },
    success: { main: '#059669' },
    info: { main: '#38bdf8' },
    background: {
      default: '#020617',
      paper: glassBg,
    },
    text: {
      primary: bodyText,
      secondary: labelMuted,
      disabled: 'rgba(255, 255, 255, 0.38)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    action: {
      hover: 'rgba(255, 255, 255, 0.06)',
      selected: 'rgba(56, 189, 248, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Manrope", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#ffffff',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#ffffff',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
      color: '#ffffff',
    },
    subtitle1: { fontWeight: 600, color: '#ffffff' },
    subtitle2: { fontWeight: 600, color: bodyText },
    body1: { fontWeight: 400, lineHeight: 1.6, color: bodyText },
    body2: { fontWeight: 400, lineHeight: 1.6, color: bodyText },
    caption: { fontWeight: 400, color: bodyText },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 20 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(at top left, #0f172a, #020617)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: `${glassBg} !important`,
          backgroundImage: 'none !important',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: glassBorder,
          borderRadius: '20px',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: 'transparent !important',
          backgroundImage: 'none !important',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: glassBorder,
          borderRadius: '20px',
          boxShadow: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '& .MuiTypography-h3, & .MuiTypography-h4, & .MuiTypography-h5, & .MuiTypography-h6, & .MuiTypography-subtitle1':
            {
              color: '#ffffff',
            },
          '& .MuiTypography-subtitle2, & .MuiTypography-caption, & .MuiTypography-overline': {
            color: labelMuted,
          },
          '& .MuiTypography-body1': { color: bodyText },
          '& .MuiTypography-body2': { color: bodyText },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRight: glassBorder,
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#f8fafc',
          borderBottom: glassBorder,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: `linear-gradient(135deg, ${electric} 0%, #2563eb 50%, ${purple} 100%)`,
          color: '#ffffff',
          boxShadow: `0 8px 28px rgba(56, 189, 248, 0.4)`,
          '&:hover': {
            background: `linear-gradient(135deg, #7dd3fc 0%, #3b82f6 50%, #c4b5fd 100%)`,
            boxShadow: `0 12px 40px rgba(56, 189, 248, 0.55)`,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        outlined: {
          color: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          '&:hover': {
            borderColor: electric,
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            color: '#ffffff',
          },
          '&.Mui-disabled': {
            borderColor: 'rgba(255, 255, 255, 0.12)',
            color: 'rgba(255, 255, 255, 0.35)',
          },
        },
        text: {
          color: '#ffffff',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${electric} 0%, #2563eb 50%, ${purple} 100%)`,
          color: '#ffffff',
          fontWeight: 700,
          boxShadow: `0 8px 28px rgba(56, 189, 248, 0.35)`,
          '&:hover': {
            background: `linear-gradient(135deg, #7dd3fc 0%, #3b82f6 50%, #c4b5fd 100%)`,
            boxShadow: `0 12px 40px rgba(56, 189, 248, 0.5), 0 0 24px rgba(167, 139, 250, 0.25)`,
          },
          '&:active': {
            boxShadow: `0 6px 20px rgba(56, 189, 248, 0.4)`,
          },
          '&.Mui-disabled': {
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.85)',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: `${glassBg} !important`,
          backgroundImage: 'none !important',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: glassBorder,
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: '#ffffff',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: focusBlue,
          },
          '& .MuiOutlinedInput-root': {
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: `${focusBlue} !important`,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255, 255, 255, 0.4)',
            opacity: 1,
          },
          '& .MuiInputBase-input': {
            color: '#ffffff',
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: focusBlue,
          },
          '& .MuiOutlinedInput-root': {
            color: '#ffffff',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: `${focusBlue} !important`,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255, 255, 255, 0.4)',
            opacity: 1,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardInfo: {
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          border: `1px solid rgba(56, 189, 248, 0.25)`,
        },
        standardWarning: {
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
        },
        standardError: {
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: glassBorder,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          color: '#94a3b8',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '10px 12px',
          lineHeight: 1.25,
          verticalAlign: 'middle',
        },
        body: {
          verticalAlign: 'middle',
        },
        sizeSmall: {
          padding: '8px 12px',
          '&.MuiTableCell-head': {
            padding: '10px 12px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#94a3b8',
            backgroundColor: 'transparent',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiDataGrid: {
      defaultProps: {
        columnHeaderHeight: 44,
        rowHeight: 48,
        disableColumnMenu: true,
        disableColumnFilter: true,
      },
      styleOverrides: {
        root: {
          border: 'none',
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          '& .MuiDataGrid-main': {
            borderRadius: 0,
          },
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },
        },
        columnHeaders: {
          backgroundColor: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          minHeight: '44px !important',
          maxHeight: '44px !important',
        },
        columnHeader: {
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#64748b',
          textTransform: 'uppercase',
          outline: 'none',
          '&:focus': { outline: 'none' },
        },
        columnHeaderTitle: {
          fontWeight: 700,
          fontSize: '0.75rem',
          lineHeight: 1.2,
        },
        columnSeparator: {
          display: 'none',
        },
        cell: {
          alignItems: 'center',
          color: '#FFFFFF',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          outline: 'none',
          '&:focus': { outline: 'none' },
          '&:focus-within': { outline: 'none' },
        },
        row: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
        footerContainer: {
          borderTop: '1px solid rgba(255, 255, 255, 0.03)',
          backgroundColor: 'transparent',
        },
      },
    },
  },
});
