import { Box, Button, Container, Stack, Typography } from '@mui/material';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoVidya } from '../components/brand/LogoVidya';
import { APP_NAME } from '../config/brandConfig';
import {
  Illustration360,
  IllustrationGrowth,
  IllustrationInsight,
  IllustrationTimeline,
} from '../components/landing/BenefitIllustrations';
import { FinancialPuzzleAnimation } from '../components/landing/FinancialPuzzleAnimation';
import { VanShowcaseSection } from '../components/landing/VanShowcaseSection';
import { FadeInView } from '../components/landing/FadeInView';

const electric = '#38bdf8';
const purple = '#a78bfa';
const baseBg = '#050508';

const easeLux = [0.22, 1, 0.36, 1] as const;

function sectionVariants() {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.11, delayChildren: 0.04 },
    },
  };
}

const viewOnce = { once: true, margin: '-72px' as const };

function blurChild(reduce: boolean) {
  return {
    hidden: reduce
      ? { opacity: 0, y: 12 }
      : { opacity: 0, y: 28, filter: 'blur(14px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.68, ease: easeLux },
    },
  };
}

const threePillars = [
  {
    title: 'Visibilidad total',
    body:
      'Deja de saltar entre apps bancarias. Mira el panorama completo de tus activos, desde efectivo hasta cripto, en una sola interfaz limpia.',
  },
  {
    title: 'Inteligencia de interés',
    body:
      'Unifica lo que ya ganas en distintos lados: tasas, apartados y plazos en una sola lectura para comparar y decidir sin adivinar.',
  },
  {
    title: 'Paz mental',
    body:
      `Calculamos tu 'Disponible Real' restando tus deudas y compromisos futuros. Si ${APP_NAME} dice que puedes, es porque realmente puedes.`,
  },
] as const;

const benefits = [
  {
    title: 'Visión 360',
    desc: 'Liquidez, compromisos y lo que viene: una sola pantalla para decidir con calma.',
    Illustration: Illustration360,
  },
  {
    title: 'Tu dinero, en movimiento',
    desc: 'Sigue el rumbo de tus ahorros y gastos sin hojas de cálculo ni adivinanzas.',
    Illustration: IllustrationGrowth,
  },
  {
    title: 'Tiempo y calendario',
    desc: 'Pagos recurrentes, metas y fechas clave alineadas con tu vida real.',
    Illustration: IllustrationTimeline,
  },
  {
    title: 'Claridad que guía',
    desc: 'Menos ruido, más señales: entiende qué importa antes de que llegue el cargo.',
    Illustration: IllustrationInsight,
  },
];

function glassCardSx(hoverGlow: boolean) {
  return {
    height: '100%',
    p: 2.75,
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.09)',
    background:
      'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.04) 100%)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease, border-color 0.35s ease',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: '-1px',
      borderRadius: '21px',
      pointerEvents: 'none',
      opacity: 0,
      transition: 'opacity 0.4s ease',
      background: `linear-gradient(125deg, transparent 0%, ${electric}55 35%, ${purple}50 55%, transparent 85%)`,
      mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
      maskComposite: 'exclude',
      WebkitMaskComposite: 'xor',
      padding: '1px',
    },
    ...(hoverGlow
      ? {
          '&:hover': {
            transform: 'translateY(-6px)',
            borderColor: 'rgba(255,255,255,0.16)',
            boxShadow: `0 0 0 1px rgba(56,189,248,0.25), 0 0 48px rgba(56,189,248,0.18), 0 0 96px rgba(167,139,250,0.12), 0 28px 56px rgba(0,0,0,0.45)`,
            '&::after': { opacity: 1 },
          },
        }
      : {}),
  };
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 0.5, y: 0.42 });

  const moveGlow = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setGlow({
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    });
  }, []);

  const leaveGlow = useCallback(() => {
    setGlow({ x: 0.5, y: 0.42 });
  }, []);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 120, damping: 22, mass: 0.4 });
  const springY = useSpring(my, { stiffness: 120, damping: 22, mass: 0.4 });
  const floatX = useTransform(springX, [-0.5, 0.5], [20, -20]);
  const floatY = useTransform(springY, [-0.5, 0.5], [-14, 14]);

  const onParallaxMove = (e: React.MouseEvent) => {
    const el = parallaxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onParallaxLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const sectionV = sectionVariants();
  const child = blurChild(!!reduceMotion);

  return (
    <Box
      ref={rootRef}
      onMouseMove={moveGlow}
      onMouseLeave={leaveGlow}
      sx={{
        minHeight: '100vh',
        bgcolor: baseBg,
        color: 'grey.100',
        fontFamily: '"Inter", "Manrope", system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Fondo: gradientes radiales que siguen el cursor */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            radial-gradient(ellipse 85% 65% at ${glow.x * 100}% ${glow.y * 100}%, rgba(167,139,250,0.14) 0%, transparent 52%),
            radial-gradient(ellipse 55% 45% at ${30 + glow.x * 25}% ${20 + glow.y * 20}%, rgba(56,189,248,0.11) 0%, transparent 48%),
            radial-gradient(ellipse 70% 50% at 50% 120%, rgba(56,189,248,0.06) 0%, transparent 45%),
            ${baseBg}
          `,
          transition: 'background 0.12s ease-out',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
        <Box
          component="header"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            px: { xs: 2, sm: 3 },
            py: 2,
          }}
        >
          <Container maxWidth="lg" disableGutters>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1.25,
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(10,10,14,0.55)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              }}
            >
              <Link to="/" className="flex items-center gap-2 no-underline text-inherit">
                <LogoVidya size={40} />
                <span className="text-lg font-medium tracking-[0.08em] text-white">{APP_NAME}</span>
              </Link>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="medium"
                sx={{
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'grey.100',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: electric, color: electric },
                }}
              >
                Acceder
              </Button>
            </Stack>
          </Container>
        </Box>

        {/* Hero */}
        <Box
          component="section"
          sx={{
            pt: { xs: 14, md: 18 },
            pb: { xs: 8, md: 10 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Container maxWidth="lg" sx={{ position: 'relative' }}>
            <motion.div
              variants={sectionV}
              initial={reduceMotion ? 'show' : 'hidden'}
              whileInView="show"
              viewport={viewOnce}
            >
              <Stack spacing={3} alignItems="center" textAlign="center" sx={{ maxWidth: 920, mx: 'auto' }}>
                <motion.div variants={child}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ color: electric }}>
                    <Sparkles size={20} strokeWidth={2} />
                    <Typography variant="overline" sx={{ letterSpacing: 0.14, fontWeight: 700, color: electric }}>
                      Visualización 360 · decisiones con claridad
                    </Typography>
                  </Stack>
                </motion.div>
                <motion.div variants={child}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.045em',
                      lineHeight: 1.06,
                      fontSize: { xs: '2.1rem', sm: '2.85rem', md: '3.55rem' },
                      background: `linear-gradient(135deg, #fff 0%, ${electric} 48%, ${purple} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Toma el control total. Mira el camino real de tu dinero.
                  </Typography>
                </motion.div>
                <motion.div variants={child}>
                  <Typography
                    variant="h6"
                    component="p"
                    sx={{
                      color: 'grey.400',
                      fontWeight: 400,
                      maxWidth: 680,
                      lineHeight: 1.65,
                      fontSize: { xs: '1rem', md: '1.125rem' },
                    }}
                  >
                    Una vista viva de tu liquidez, tus compromisos y lo que viene. Sin jerga: solo lo que necesitas
                    para decidir mejor, hoy.
                  </Typography>
                </motion.div>
                <motion.div variants={child}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                    <Button
                      component={Link}
                      to="/register"
                      variant="contained"
                      size="large"
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: '14px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1rem',
                        background: `linear-gradient(135deg, ${electric} 0%, #2563eb 50%, ${purple} 100%)`,
                        boxShadow: `0 12px 40px ${electric}44`,
                        '&:hover': { boxShadow: `0 16px 48px ${purple}55` },
                      }}
                    >
                      Comenzar ahora
                    </Button>
                    <Button
                      component="a"
                      href="#producto"
                      variant="outlined"
                      size="large"
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: '14px',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'grey.100',
                        '&:hover': { borderColor: purple, color: purple },
                      }}
                    >
                      Ver demo
                    </Button>
                  </Stack>
                </motion.div>
              </Stack>
            </motion.div>
          </Container>
        </Box>

        {/* Crecimiento automático (antes “tramos”) */}
        <Box component="section" sx={{ py: { xs: 5, md: 7 } }}>
          <Container maxWidth="md">
            <motion.div
              variants={sectionV}
              initial={reduceMotion ? 'show' : 'hidden'}
              whileInView="show"
              viewport={viewOnce}
            >
              <motion.div variants={child}>
                <Box
                  sx={{
                    ...glassCardSx(false),
                    p: { xs: 3, md: 4 },
                    textAlign: 'center',
                    borderColor: 'rgba(56,189,248,0.15)',
                  }}
                >
                  <FadeInView>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.35,
                        color: 'white',
                        fontSize: { xs: '1.15rem', sm: '1.35rem', md: '1.5rem' },
                      }}
                    >
                      Tus rendimientos ya existen en tus cuentas y cajitas. {APP_NAME} los concentra para que veas el
                      impacto real, sin saltar entre apps.
                    </Typography>
                  </FadeInView>
                  <FadeInView delay={0.08}>
                    <Typography variant="body2" color="grey.500" sx={{ mt: 2, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
                      No creamos rendimientos: ordenamos la información para que midas tu ganancia neta con claridad.
                    </Typography>
                  </FadeInView>
                </Box>
              </motion.div>
            </motion.div>
          </Container>
        </Box>

        {/* Por qué Vidya — tres pilares */}
        <Box component="section" sx={{ py: { xs: 7, md: 10 } }}>
          <Container maxWidth="lg">
            <FadeInView>
              <Typography
                variant="overline"
                textAlign="center"
                sx={{ display: 'block', letterSpacing: 0.16, fontWeight: 700, color: electric, mb: 1.5 }}
              >
                {`Por qué ${APP_NAME}`}
              </Typography>
            </FadeInView>
            <FadeInView delay={0.06}>
              <Typography
                variant="h4"
                component="h2"
                textAlign="center"
                sx={{ fontWeight: 800, letterSpacing: '-0.035em', mb: 1, color: 'white' }}
              >
                Tres pilares para decidir con confianza
              </Typography>
            </FadeInView>
            <FadeInView delay={0.1}>
              <Typography
                textAlign="center"
                color="grey.500"
                sx={{ mb: { xs: 4, md: 5 }, maxWidth: 560, mx: 'auto', lineHeight: 1.65 }}
              >
                Menos ruido, más claridad: lo esencial para tu dinero, sin perder el detalle.
              </Typography>
            </FadeInView>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: { xs: 2.5, md: 3 },
              }}
            >
              {threePillars.map((pillar, i) => (
                <FadeInView key={pillar.title} delay={0.08 + i * 0.07}>
                  <Box
                    sx={{
                      height: '100%',
                      p: 3,
                      borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.09)',
                      background:
                        'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, color: 'white' }}
                    >
                      {pillar.title}
                    </Typography>
                    <Typography variant="body2" color="grey.400" sx={{ lineHeight: 1.75 }}>
                      {pillar.body}
                    </Typography>
                  </Box>
                </FadeInView>
              ))}
            </Box>
          </Container>
        </Box>

        {/* Beneficios — stagger + blur */}
        <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <motion.div
              variants={sectionV}
              initial={reduceMotion ? 'show' : 'hidden'}
              whileInView="show"
              viewport={viewOnce}
            >
              <motion.div variants={child}>
                <Typography
                  variant="h4"
                  component="h2"
                  textAlign="center"
                  sx={{ fontWeight: 800, letterSpacing: '-0.035em', mb: 1, color: 'white' }}
                >
                  Decisiones con contexto
                </Typography>
              </motion.div>
              <motion.div variants={child}>
                <Typography textAlign="center" color="grey.500" sx={{ mb: 3, maxWidth: 580, mx: 'auto', lineHeight: 1.65 }}>
                  Cada número cuenta una historia: la tuya, en orden.
                </Typography>
              </motion.div>
            </motion.div>

            <FadeInView>
              <Box
                sx={{
                  mb: 4,
                  py: 3,
                  px: { xs: 2.5, md: 4 },
                  borderRadius: '16px',
                  textAlign: 'center',
                  border: `1px solid rgba(56,189,248,0.2)`,
                  background: `linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(167,139,250,0.08) 100%)`,
                  boxShadow: `0 0 40px rgba(56,189,248,0.08)`,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: 'white',
                    fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.45rem' },
                    lineHeight: 1.35,
                  }}
                >
                  Visualiza tu rendimiento real: ¿Cuánto estás ganando hoy de verdad?
                </Typography>
                <Typography
                  variant="body2"
                  color="grey.400"
                  sx={{ mt: 2, maxWidth: 640, mx: 'auto', lineHeight: 1.75 }}
                >
                  Tener un 13% aquí y un 15% allá no es una estrategia, es desorden. {APP_NAME} concentra toda tu
                  información para mostrarte la ganancia real neta que obtienes día a día.
                </Typography>
              </Box>
            </FadeInView>

            <motion.div
              variants={sectionV}
              initial={reduceMotion ? 'show' : 'hidden'}
              whileInView="show"
              viewport={viewOnce}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: 2.5,
                }}
              >
                {benefits.map((b) => (
                  <motion.div key={b.title} variants={child}>
                    <Box sx={glassCardSx(true)}>
                      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                        <b.Illustration className="h-[112px] w-[112px]" />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1, color: 'white' }}>
                        {b.title}
                      </Typography>
                      <Typography variant="body2" color="grey.500" sx={{ lineHeight: 1.65 }}>
                        {b.desc}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* Potencia tus datos */}
        <Box component="section" sx={{ py: { xs: 5, md: 8 } }}>
          <Container maxWidth="md">
            <FadeInView>
              <Typography
                variant="overline"
                textAlign="center"
                sx={{ display: 'block', letterSpacing: 0.16, fontWeight: 700, color: purple, mb: 1.5 }}
              >
                Potencia tus datos
              </Typography>
            </FadeInView>
            <FadeInView delay={0.06}>
              <Typography
                variant="h4"
                component="h2"
                textAlign="center"
                sx={{ fontWeight: 800, letterSpacing: '-0.035em', mb: 2, color: 'white' }}
              >
                Más datos, más nitidez
              </Typography>
            </FadeInView>
            <FadeInView delay={0.1}>
              <Typography
                color="grey.400"
                textAlign="center"
                sx={{ lineHeight: 1.8, maxWidth: 720, mx: 'auto', fontSize: { xs: '0.95rem', md: '1rem' } }}
              >
                Entre más información proporcionas, más nítida es tu visión. Registra tus MSI, tus apartados en cajitas y
                tus inversiones a plazo para que {APP_NAME} pueda construir tu mapa financiero exacto.
              </Typography>
            </FadeInView>
          </Container>
        </Box>

        {/* Rompecabezas financiero: datos → patrimonio */}
        <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <FinancialPuzzleAnimation />
          </Container>
        </Box>

        {/* Vi — showcase chat */}
        <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <VanShowcaseSection />
          </Container>
        </Box>

        {/* Mock dashboard — parallax + copy estrategia */}
        <Box id="producto" component="section" sx={{ py: { xs: 6, md: 12 }, scrollMarginTop: '96px' }}>
          <Container maxWidth="lg">
            <motion.div
              variants={sectionV}
              initial={reduceMotion ? 'show' : 'hidden'}
              whileInView="show"
              viewport={viewOnce}
            >
              <motion.div variants={child}>
                <Typography variant="h4" textAlign="center" sx={{ fontWeight: 800, letterSpacing: '-0.035em', mb: 1.5 }}>
                  Visualiza hoy las decisiones de mañana
                </Typography>
              </motion.div>
              <motion.div variants={child}>
                <Typography textAlign="center" color="grey.500" sx={{ mb: 4, maxWidth: 640, mx: 'auto', lineHeight: 1.65 }}>
                  Gastos, ingresos e inversiones en una sola línea de tiempo clara.
                </Typography>
              </motion.div>
            </motion.div>

            <Box
              ref={parallaxRef}
              onMouseMove={onParallaxMove}
              onMouseLeave={onParallaxLeave}
              sx={{ position: 'relative', maxWidth: 960, mx: 'auto', py: 2 }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: '-18%',
                  background: `radial-gradient(circle at 50% 45%, ${electric}38 0%, ${purple}24 38%, transparent 68%)`,
                  filter: 'blur(52px)',
                  opacity: 0.92,
                  zIndex: 0,
                }}
              />
              <motion.div style={{ x: floatX, y: floatY, position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, #10151c 0%, #07090c 100%)',
                    boxShadow: '0 28px 90px rgba(0,0,0,0.55)',
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#eab308' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
                    <Typography variant="caption" sx={{ ml: 2, color: 'grey.600' }}>
                      {APP_NAME} · Disponibilidad real
                    </Typography>
                  </Box>
                  <Box sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={2}>
                        <Box>
                          <Typography variant="caption" color="grey.500">
                            Liquidez disponible (est.)
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: electric }}>
                            $ 124,580.00
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: '12px',
                            bgcolor: 'rgba(56,189,248,0.12)',
                            border: `1px solid ${electric}44`,
                          }}
                        >
                          <Typography variant="caption" sx={{ color: electric, fontWeight: 700 }}>
                            +12.4% vs. mes anterior
                          </Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                        {['Bancos', 'Inversiones', 'Compromisos'].map((label, i) => (
                          <Box
                            key={label}
                            sx={{
                              p: 2,
                              borderRadius: '12px',
                              bgcolor: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            <Typography variant="caption" color="grey.500">
                              {label}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                              {i === 0 ? '$ 82,400' : i === 1 ? '$ 38,200' : '$ 3,980'}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                      <Box
                        sx={{
                          height: 120,
                          borderRadius: '12px',
                          background: `linear-gradient(90deg, ${purple}33 0%, ${electric}22 100%)`,
                          opacity: 0.88,
                        }}
                      />
                    </Stack>
                  </Box>
                </Box>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Seguridad */}
        <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
          <Container maxWidth="md">
            <motion.div
              variants={sectionV}
              initial={reduceMotion ? 'show' : 'hidden'}
              whileInView="show"
              viewport={viewOnce}
            >
              <motion.div variants={child}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    py: 3,
                    px: 3,
                    borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.09)',
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(56,189,248,0.05) 100%)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '14px',
                      display: 'grid',
                      placeItems: 'center',
                      background: `linear-gradient(135deg, ${purple}33, ${electric}22)`,
                      color: '#c4b5fd',
                    }}
                    aria-hidden
                  >
                    <Lock size={22} strokeWidth={2} />
                  </Box>
                  <Typography textAlign={{ xs: 'center', sm: 'left' }} sx={{ color: 'grey.300', fontWeight: 500, lineHeight: 1.55 }}>
                    Tu información es privada. Seguridad de grado bancario para tu estrategia personal.
                  </Typography>
                </Stack>
              </motion.div>
            </motion.div>
            <FadeInView>
              <Typography
                variant="body2"
                component="p"
                textAlign="center"
                sx={{
                  mt: 3,
                  px: { xs: 1, sm: 2 },
                  color: 'grey.600',
                  lineHeight: 1.7,
                  fontSize: '0.8125rem',
                  maxWidth: 560,
                  mx: 'auto',
                }}
              >
                {APP_NAME} no se conecta a tus bancos. Tu privacidad es primero: tú tienes el control de la información y
                nosotros el poder del análisis.
              </Typography>
            </FadeInView>
          </Container>
        </Box>

        {/* Banner de cierre — antes del footer */}
        <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
          <Container maxWidth="md">
            <FadeInView>
              <Box
                sx={{
                  py: { xs: 4, md: 6 },
                  px: { xs: 2.5, md: 5 },
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background:
                    'linear-gradient(165deg, rgba(167,139,250,0.12) 0%, rgba(56,189,248,0.06) 45%, rgba(255,255,255,0.03) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.35,
                    color: 'white',
                    fontSize: { xs: '1.35rem', sm: '1.65rem', md: '1.85rem' },
                    mb: { xs: 3, md: 4 },
                  }}
                >
                  El mejor momento para empezar fue ayer. El segundo mejor es hoy. Únete a {APP_NAME} y domina tus
                  finanzas.
                </Typography>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{
                    py: 2.25,
                    px: 3,
                    borderRadius: '16px',
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: { xs: '1.05rem', md: '1.15rem' },
                    maxWidth: 520,
                    mx: 'auto',
                    display: 'block',
                    background: `linear-gradient(135deg, ${electric} 0%, #2563eb 45%, ${purple} 100%)`,
                    boxShadow: `0 16px 48px ${electric}55, 0 8px 24px rgba(167,139,250,0.25)`,
                    '&:hover': {
                      boxShadow: `0 20px 56px ${purple}44`,
                    },
                  }}
                >
                  Crear mi cuenta gratuita
                </Button>
              </Box>
            </FadeInView>
          </Container>
        </Box>

        {/* Footer */}
        <Box component="footer" sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', py: 5 }}>
          <Container maxWidth="lg">
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Link to="/" className="flex items-center gap-2 no-underline text-inherit">
                <LogoVidya size={36} />
                <span className="font-medium tracking-[0.08em] text-white">{APP_NAME}</span>
              </Link>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Link to="/register" className="text-sm text-zinc-400 no-underline hover:text-white">
                  Registro
                </Link>
                <Link to="/login" className="text-sm text-zinc-400 no-underline hover:text-white">
                  Acceder
                </Link>
                <a href="#producto" className="text-sm text-zinc-400 no-underline hover:text-white">
                  Producto
                </a>
              </Stack>
            </Stack>
            <Typography variant="caption" color="grey.600" sx={{ display: 'block', mt: 3 }}>
              © {new Date().getFullYear()} {APP_NAME}. Visualización 360 para decisiones reales.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
