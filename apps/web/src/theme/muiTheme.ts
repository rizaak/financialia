import { createTheme } from '@mui/material/styles';

/** Vantix: primario azul eléctrico (#0D47A1), neutros zinc, DM Sans. */
export const appMuiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0D47A1',
      dark: '#082654',
      light: '#1565C0',
      contrastText: '#ffffff',
    },
    secondary: { main: '#7B1FA2', contrastText: '#ffffff' },
    error: { main: '#e11d48' },
    warning: { main: '#d97706' },
    success: { main: '#059669' },
    info: { main: '#1565C0' },
    background: { default: '#fafafa', paper: '#ffffff' },
    text: { primary: '#18181b', secondary: '#71717a' },
    divider: '#e4e4e7',
    action: { hover: 'rgba(24, 24, 27, 0.04)' },
  },
  typography: {
    fontFamily: '"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          borderColor: '#e4e4e7',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e4e4e7',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#18181b',
          borderBottom: '1px solid #e4e4e7',
          boxShadow: 'none',
        },
      },
    },
  },
});
