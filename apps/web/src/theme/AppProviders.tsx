import { CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { appMuiTheme } from './muiTheme';

type Props = { children: ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider theme={appMuiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
