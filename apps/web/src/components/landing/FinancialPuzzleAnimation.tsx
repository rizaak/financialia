import { Box, Tooltip, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

const electric = '#38bdf8';
const purple = '#a78bfa';
const mint = '#34d399';

const HOVER_COPY =
  'Sin este dato, tu panorama está incompleto. Con él, tu decisión es inteligente.';

type BlockConfig = {
  label: string;
  from: 'left' | 'right' | 'bottom';
  delay: number;
  color: string;
};

const DATA_BLOCKS: BlockConfig[] = [
  { label: 'Cajita Nu', from: 'left', delay: 0, color: electric },
  { label: 'MSI Liverpool', from: 'right', delay: 0.14, color: purple },
  { label: 'Cetes', from: 'bottom', delay: 0.28, color: mint },
];

function blockInitial(from: BlockConfig['from'], reduce: boolean) {
  if (reduce) return { opacity: 1, x: 0, y: 0 };
  if (from === 'left') return { opacity: 0, x: -140, y: 0 };
  if (from === 'right') return { opacity: 0, x: 140, y: 0 };
  return { opacity: 0, x: 0, y: 96 };
}

function DataChip({ label, color }: { label: string; color: string }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.85,
        borderRadius: '12px',
        border: `1px solid ${color}55`,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        display: 'inline-block',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 12px 32px rgba(0,0,0,0.45), 0 0 24px ${color}33`,
          borderColor: `${color}99`,
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'white',
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function PatrimonioChart({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { scale: 0.88, opacity: 0.5 }}
      whileInView={reduce ? undefined : { scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.2 }}
      style={{ position: 'relative', zIndex: 1 }}
    >
      <Box
        sx={{
          width: { xs: 132, sm: 152 },
          height: { xs: 132, sm: 152 },
          borderRadius: '50%',
          background: `conic-gradient(${electric} 0deg 118deg, ${purple} 118deg 238deg, ${mint} 238deg 360deg)`,
          p: '10px',
          boxShadow: `0 0 48px rgba(56,189,248,0.2), 0 0 80px rgba(167,139,250,0.12)`,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            bgcolor: '#0a0c10',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 600, letterSpacing: 0.06 }}>
            Patrimonio
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.02em', mt: 0.25 }}>
            Total
          </Typography>
          <Typography variant="caption" sx={{ color: electric, fontWeight: 700, mt: 0.5, fontSize: '0.7rem' }}>
            Vista unificada
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

export function FinancialPuzzleAnimation() {
  const reduce = !!useReducedMotion();

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.035em',
          mb: { xs: 3, md: 4 },
          color: 'white',
          fontSize: { xs: '1.35rem', sm: '1.65rem', md: '1.85rem' },
          lineHeight: 1.25,
          maxWidth: 640,
          mx: 'auto',
        }}
      >
        Tu información construye tu libertad.
      </Typography>

      <Box
        sx={{
          position: 'relative',
          mx: 'auto',
          maxWidth: 560,
          minHeight: { xs: 300, sm: 320 },
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <PatrimonioChart reduce={reduce} />
        </Box>

        {DATA_BLOCKS.map((b) => {
          const placement = b.from === 'bottom' ? 'top' : b.from === 'left' ? 'right' : 'left';
          const pos =
            b.from === 'bottom'
              ? { left: '50%', bottom: '5%' }
              : b.from === 'left'
                ? { top: '34%', left: '2%' }
                : { top: '34%', right: '2%' };

          const motionEl = (
            <motion.div
              initial={blockInitial(b.from, reduce)}
              whileInView={reduce ? undefined : { opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 26,
                mass: 0.65,
                delay: b.delay,
              }}
              style={{
                position: 'absolute',
                zIndex: 2,
                ...pos,
              }}
            >
              {b.from === 'bottom' ? (
                <Box sx={{ transform: 'translateX(-50%)' }}>
                  <DataChip label={b.label} color={b.color} />
                </Box>
              ) : (
                <DataChip label={b.label} color={b.color} />
              )}
            </motion.div>
          );

          return (
            <Tooltip
              key={b.label}
              title={HOVER_COPY}
              arrow
              placement={placement}
              enterTouchDelay={0}
              slotProps={{
                tooltip: {
                  sx: {
                    maxWidth: 300,
                    fontSize: '0.8125rem',
                    lineHeight: 1.55,
                    bgcolor: 'rgba(15,17,22,0.96)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  },
                },
              }}
            >
              {motionEl}
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
