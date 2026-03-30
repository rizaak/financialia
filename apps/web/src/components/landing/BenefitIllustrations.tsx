import { motion, useReducedMotion } from 'framer-motion';

const electric = '#38bdf8';
const purple = '#a78bfa';

type Props = { className?: string };

/** Ilustración lineal animada: vista 360 / radar de decisión */
export function Illustration360({ className }: Props) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="g360" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={electric} />
          <stop offset="100%" stopColor={purple} />
        </linearGradient>
      </defs>
      <motion.circle
        cx="60"
        cy="60"
        r="44"
        stroke="url(#g360)"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        initial={reduce ? false : { pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 0.55 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx="60"
        cy="60"
        r="28"
        stroke="url(#g360)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M60 32v56M32 60h56"
        stroke="url(#g360)"
        strokeWidth="1.25"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.85 }}
        transition={{ duration: 0.9, delay: 0.35 }}
      />
      <motion.circle
        cx="60"
        cy="60"
        r="6"
        fill={electric}
        fillOpacity="0.9"
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.5 }}
      />
    </svg>
  );
}

/** Crecimiento / curva ascendente */
export function IllustrationGrowth({ className }: Props) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="gg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={purple} />
          <stop offset="100%" stopColor={electric} />
        </linearGradient>
      </defs>
      <motion.path
        d="M20 88 Q 38 72, 52 58 T 88 28"
        stroke="url(#gg)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx="88"
        cy="28"
        r="7"
        stroke={electric}
        strokeWidth="2"
        fill="rgba(56,189,248,0.15)"
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.9, stiffness: 400, damping: 18 }}
      />
      <motion.path
        d="M20 92h80"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />
    </svg>
  );
}

/** Línea de tiempo / calendario */
export function IllustrationTimeline({ className }: Props) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="gtl" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={electric} />
          <stop offset="100%" stopColor={purple} />
        </linearGradient>
      </defs>
      <motion.path
        d="M24 64h72"
        stroke="url(#gtl)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      {[32, 60, 88].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy="64"
          r="9"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          fill={i === 1 ? 'rgba(167,139,250,0.25)' : 'rgba(56,189,248,0.12)'}
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.35 + i * 0.12, stiffness: 420, damping: 20 }}
        />
      ))}
      <motion.path
        d="M32 40v16M60 36v20M88 42v14"
        stroke={electric}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
      />
    </svg>
  );
}

/** Luz / insight */
export function IllustrationInsight({ className }: Props) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="gin" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={purple} />
          <stop offset="100%" stopColor={electric} />
        </linearGradient>
      </defs>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line
          key={deg}
          x1="60"
          y1="60"
          x2="60"
          y2="22"
          stroke="url(#gin)"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${deg} 60 60)`}
          initial={reduce ? false : { opacity: 0, pathLength: 0 }}
          animate={{ opacity: 0.75, pathLength: 1 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
        />
      ))}
      <motion.circle
        cx="60"
        cy="60"
        r="18"
        fill="rgba(167,139,250,0.2)"
        stroke={electric}
        strokeWidth="1.5"
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.35, stiffness: 300, damping: 20 }}
      />
    </svg>
  );
}
