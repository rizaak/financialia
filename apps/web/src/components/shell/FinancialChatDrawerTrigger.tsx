import { Box, Drawer, Fab, IconButton, Typography, useTheme } from '@mui/material';
import { MessageCircle, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { FinancialChatInsights } from './FinancialChatInsights';

const QUICK_ACTIONS_FAB_OFFSET = 88;

type Props = {
  getAccessToken: () => Promise<string>;
};

/**
 * FAB inferior derecho (encima del FAB de acciones rápidas) que abre el chat de consultas en un Drawer lateral.
 */
export function FinancialChatDrawerTrigger({ getAccessToken }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Fab
        color="primary"
        aria-label="Abrir Vantix AI"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: 24,
          bottom: QUICK_ACTIONS_FAB_OFFSET,
          zIndex: theme.zIndex.drawer + 2,
        }}
      >
        <MessageCircle size={26} strokeWidth={2.25} />
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              maxWidth: '100vw',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Vantix AI
          </Typography>
          <IconButton aria-label="Cerrar panel" onClick={handleClose} size="small">
            <X size={20} strokeWidth={2} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2 }}>
          <FinancialChatInsights getAccessToken={getAccessToken} variant="drawer" />
        </Box>
      </Drawer>
    </>
  );
}
