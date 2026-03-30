import { Box, Typography } from '@mui/material';
import { APP_VERSION } from '../../lib/appVersion';

/**
 * Badge discreto con la versión de la app (package.json vía Vite).
 */
export function VersionBadge() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.35,
        borderRadius: '999px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.7rem',
          fontWeight: 500,
          color: '#64748b',
          letterSpacing: '0.02em',
          lineHeight: 1.2,
        }}
      >
        Vantix v{APP_VERSION}
      </Typography>
    </Box>
  );
}
