import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

const VAN_BRAND = '#38bdf8';

type Props = {
  children: ReactNode;
};

/**
 * Pantalla de registro (Auth0 signup) con mensaje de Van y misma estética que login.
 */
export function AuthRegisterShell({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 text-sm text-zinc-400">
      <div className="relative flex w-full max-w-md flex-col items-center gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full rounded-2xl border border-white/10 bg-zinc-900/85 px-4 py-4 text-center shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: VAN_BRAND }}>
            Van
          </p>
          <p className="text-sm leading-relaxed text-zinc-300">
            Cada dato que registras me ayuda a darte mejores consejos. Empecemos a construir tu visión 360.
          </p>
        </motion.div>

        <AnimatePresence>
          <motion.div
            key="register-shell"
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
