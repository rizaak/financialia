import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  children: ReactNode;
  /** Retraso en segundos antes de animar */
  delay?: number;
  className?: string;
};

/**
 * Párrafos y bloques que entran al hacer scroll: fade + slide desde y=20.
 */
export function FadeInView({ children, delay = 0, className }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
