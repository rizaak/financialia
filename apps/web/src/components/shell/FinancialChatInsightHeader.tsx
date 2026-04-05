import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { MessageCircle } from 'lucide-react';
import { APP_AI_LABEL } from '../../config/brandConfig';

export function FinancialChatInsightHeader() {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          color: 'primary.main',
        }}
      >
        <MessageCircle size={22} strokeWidth={2} />
      </Box>
      <Box>
        <Typography variant="overline" color="primary" fontWeight={800} sx={{ lineHeight: 1.2 }}>
          {APP_AI_LABEL}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pregunta por tus gastos, categorías o inversiones; la respuesta usa tus datos reales.
        </Typography>
      </Box>
    </Stack>
  );
}
