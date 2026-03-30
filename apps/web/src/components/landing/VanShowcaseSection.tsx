import { Box, Stack, Typography } from '@mui/material';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const electric = '#38bdf8';
const purple = '#a78bfa';

const MESSAGES = {
  van1:
    "Si mantienes tu gasto en comida debajo de $3,000, completarás tu meta de 'Vuelos' en 15 días. ¡Tú puedes!",
  user2: '¿Cuánto gané hoy en total?',
  van2:
    'Hoy tus inversiones generaron $18.50 mientras dormías. Tu rendimiento real ponderado subió un 0.2%.',
} as const;

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/6 px-3 py-2.5"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-2 w-2 rounded-full bg-sky-400/90"
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.55,
            repeat: Infinity,
            delay: i * 0.14,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}

function VanAvatar() {
  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(145deg, ${electric} 0%, #2563eb 50%, ${purple} 100%)`,
        boxShadow: `
          0 0 0 1px rgba(56,189,248,0.35),
          0 0 28px rgba(56,189,248,0.55),
          0 0 56px rgba(56,189,248,0.25),
          0 0 80px rgba(167,139,250,0.12)
        `,
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: 'white', lineHeight: 1 }}>V</Typography>
    </Box>
  );
}

type BubbleProps = {
  children: ReactNode;
  side: 'user' | 'van';
};

function ChatBubble({ children, side }: BubbleProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      style={{ alignSelf: side === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}
    >
      {side === 'van' ? (
        <Stack direction="row" spacing={1.25} alignItems="flex-end">
          <VanAvatar />
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: '18px 18px 18px 6px',
              bgcolor: 'rgba(56,189,248,0.12)',
              border: '1px solid rgba(56,189,248,0.22)',
              color: 'grey.100',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1.55, fontSize: '0.8125rem' }}>
              {children}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: '18px 18px 6px 18px',
            bgcolor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'grey.100',
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.55, fontSize: '0.8125rem' }}>
            {children}
          </Typography>
        </Box>
      )}
    </motion.div>
  );
}

/**
 * Showcase del copiloto Van: chat simulado en marco tipo teléfono con typing y resplandor en avatar.
 */
export function VanShowcaseSection() {
  const reduce = !!useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.28 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setStep(6);
      return;
    }
    const ids: ReturnType<typeof setTimeout>[] = [];
    const go = (ms: number, next: number) => ids.push(setTimeout(() => setStep(next), ms));
    go(350, 1);
    go(850, 2);
    go(2600, 3);
    go(3150, 4);
    go(3750, 5);
    go(5300, 6);
    return () => ids.forEach(clearTimeout);
  }, [inView, reduce]);

  const showU1 = step >= 1;
  const showTyping1 = step === 2;
  const showV1 = step >= 3;
  const showU2 = step >= 4;
  const showTyping2 = step === 5;
  const showV2 = step >= 6;

  const typingAlign = { pl: '52px' };

  return (
    <Box ref={containerRef}>
      <Typography
        variant="h4"
        component="h2"
        textAlign="center"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.035em',
          mb: 1.5,
          color: 'white',
          fontSize: { xs: '1.35rem', sm: '1.65rem', md: '1.85rem' },
          lineHeight: 1.25,
          maxWidth: 720,
          mx: 'auto',
        }}
      >
        Conoce a{' '}
        <Box component="span" sx={{ color: electric, fontWeight: 800 }}>
          Van
        </Box>
        : Tu Copiloto Financiero.
      </Typography>
      <Typography
        textAlign="center"
        color="grey.500"
        sx={{
          mb: { xs: 4, md: 5 },
          maxWidth: 720,
          mx: 'auto',
          lineHeight: 1.75,
          fontSize: { xs: '0.95rem', md: '1rem' },
        }}
      >
        Deja de adivinar.{' '}
        <Box component="span" sx={{ color: electric, fontWeight: 700 }}>
          Van
        </Box>{' '}
        analiza tus ingresos, gastos e inversiones para darte la respuesta exacta en segundos. Entre más le cuentas, más
        inteligente se vuelve tu panorama.
      </Typography>

      <Box
        sx={{
          maxWidth: 400,
          mx: 'auto',
          borderRadius: '40px',
          p: '10px',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* “Dynamic Island” + barra */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 1,
            pb: 1.5,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 28,
              borderRadius: '20px',
              bgcolor: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </Box>

        <Box
          sx={{
            borderRadius: '28px',
            bgcolor: '#07090d',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(90deg, rgba(56,189,248,0.06) 0%, transparent 100%)',
            }}
          >
            <VanAvatar />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: electric, letterSpacing: '-0.02em' }}>
                Van
              </Typography>
              <Typography variant="caption" sx={{ color: electric, fontWeight: 600, fontSize: '0.65rem' }}>
                Copiloto financiero
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              p: 2,
              minHeight: 320,
              maxHeight: 420,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {showU1 && (
              <ChatBubble side="user">
                <>
                  <Box component="span" sx={{ color: electric, fontWeight: 800 }}>
                    Van
                  </Box>
                  , ¿me alcanza para el viaje a la playa si ahorro este mes?
                </>
              </ChatBubble>
            )}

            {showTyping1 && (
              <Box sx={{ ...typingAlign, display: 'flex', justifyContent: 'flex-start' }}>
                <TypingIndicator />
              </Box>
            )}

            {showV1 && <ChatBubble side="van">{MESSAGES.van1}</ChatBubble>}

            {showU2 && <ChatBubble side="user">{MESSAGES.user2}</ChatBubble>}

            {showTyping2 && (
              <Box sx={{ ...typingAlign, display: 'flex', justifyContent: 'flex-start' }}>
                <TypingIndicator />
              </Box>
            )}

            {showV2 && <ChatBubble side="van">{MESSAGES.van2}</ChatBubble>}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
