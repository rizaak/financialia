import { Box, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

const electric = '#38bdf8';
const purple = '#a78bfa';

/**
 * Copiloto Van: franja superior con avatar con pulso de energía y saludo.
 */
export function VanAssistant() {
  const reduce = useReducedMotion();

  return (
    <Box
      sx={{
        position: 'sticky',
        top: { xs: 0, md: 0 },
        zIndex: 2,
        mb: 2,
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        px: { xs: 2, sm: 2.5 },
        py: 1.75,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
          {!reduce && (
            <motion.div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${electric}, ${purple})`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.45, 0.15, 0.45],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          <Box
            sx={{
              position: 'relative',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `linear-gradient(145deg, ${electric} 0%, #2563eb 50%, ${purple} 100%)`,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              color: 'white',
              fontSize: '1.05rem',
              boxShadow: `0 0 28px ${electric}55, 0 0 0 1px rgba(255,255,255,0.12)`,
            }}
          >
            V
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontWeight: 400,
            lineHeight: 1.55,
            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
          }}
        >
          <Box component="span" sx={{ color: electric, fontWeight: 700 }}>
            Hola, soy Van.
          </Box>{' '}
          ¿En qué optimizamos hoy?
        </Typography>
      </Stack>
    </Box>
  );
}
