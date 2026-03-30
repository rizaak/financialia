import { Badge, Box, Tooltip, Typography } from '@mui/material';

const electric = '#38bdf8';

type Props = {
  showNotification: boolean;
  message: string;
  /** Menú lateral colapsado: solo avatar + badge. */
  compact?: boolean;
};

/**
 * Bloque "Estado de Van" en la parte superior del sidebar.
 */
export function VanSidebarStatus({ showNotification, message, compact }: Props) {
  if (compact) {
    return (
      <Tooltip title={message} placement="right" arrow>
        <Box
          className="mb-2 flex justify-center px-1"
          sx={{ cursor: 'default' }}
          role="status"
          aria-live="polite"
        >
          <Badge
            variant="dot"
            color="primary"
            overlap="circular"
            invisible={!showNotification}
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#f43f5e',
                boxShadow: '0 0 0 2px rgba(15,23,42,0.95)',
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: '0.85rem',
                color: 'white',
                background: `linear-gradient(145deg, ${electric} 0%, #2563eb 50%, #a78bfa 100%)`,
                boxShadow: `0 0 20px ${electric}44`,
              }}
            >
              V
            </Box>
          </Badge>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        mb: 2,
        mx: 1,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        px: 1.5,
        py: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Badge
          variant="dot"
          color="primary"
          overlap="circular"
          invisible={!showNotification}
          sx={{
            mt: 0.25,
            '& .MuiBadge-badge': {
              backgroundColor: '#f43f5e',
              boxShadow: '0 0 0 2px rgba(15,23,42,0.95)',
            },
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: '0.8rem',
              color: 'white',
              flexShrink: 0,
              background: `linear-gradient(145deg, ${electric} 0%, #2563eb 50%, #a78bfa 100%)`,
              boxShadow: `0 0 18px ${electric}40`,
            }}
          >
            V
          </Box>
        </Badge>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: electric, fontWeight: 800, letterSpacing: 0.04, display: 'block' }}>
            Estado de Van
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 400, lineHeight: 1.45, display: 'block', mt: 0.25 }}>
            {message}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
