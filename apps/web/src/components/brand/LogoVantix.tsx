import { useId } from 'react';

type Props = {
  /** Tamaño del icono en px (cuadrado). */
  size?: number;
  className?: string;
  'aria-label'?: string;
};

/**
 * Marca Vantix: V y X entrelazadas sobre un prisma hexagonal (vista cenital).
 * Degradado azul zafiro → cian.
 */
export function LogoVantix({ size = 36, className, 'aria-label': ariaLabel = 'Vantix' }: Props) {
  const rawId = useId();
  const gid = `vantix-grad-${rawId.replace(/:/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0C4A6E" />
          <stop offset="0.45" stopColor="#1565C0" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      {/* Prisma hexagonal (cara superior) — hexágono plano con borde superior plano */}
      <path
        d="M32 6 L52 17.5 L52 40.5 L32 52 L12 40.5 L12 17.5 Z"
        stroke={`url(#${gid})`}
        strokeWidth="2.25"
        strokeLinejoin="round"
        fill="none"
        opacity={0.95}
      />

      {/* V: desde vértices superiores laterales al vértice inferior del prisma (entrelaza con la X) */}
      <path
        d="M12 17.5 L32 52 L52 17.5"
        stroke={`url(#${gid})`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* X: diagonales que cruzan el interior del prisma (entrelazadas con la V en el centro) */}
      <path
        d="M12 40.5 L52 17.5 M52 40.5 L12 17.5"
        stroke={`url(#${gid})`}
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.92}
      />
    </svg>
  );
}
