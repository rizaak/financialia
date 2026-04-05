import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { VI_WELCOME } from '../config/brandConfig';

/** Acento Vi / Vidya (alineado con landing) */
const VI_ACCENT = '#38bdf8';

type Props = {
  children: ReactNode;
};

/**
 * Contenedor de login con entrada suave (Auth0 redirect o futuro formulario local).
 * Mensaje de Vi aparece 1s después de cargar (fade-in).
 */
export function LoginPage({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 text-sm text-zinc-400">
      <div className="relative flex w-full max-w-md flex-col items-center gap-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full rounded-2xl border border-white/10 bg-zinc-900/85 px-4 py-3.5 text-center shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          <p className="relative z-10 text-sm leading-relaxed text-zinc-200">
            <span style={{ color: VI_ACCENT }} className="font-semibold">
              {VI_WELCOME}
            </span>{' '}
            Ingresa para que sigamos optimizando tu dinero.
          </p>
          <div
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2"
            aria-hidden
          >
            <div className="h-0 w-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-zinc-900/90" />
          </div>
        </motion.div>

        <AnimatePresence>
          <motion.div
            key="login-shell"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.85 }}
            className="w-full text-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
