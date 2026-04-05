import { useId } from 'react';
import { APP_NAME } from '../../config/brandConfig';

type Props = {
  /** Tamaño del icono en px (cuadrado). */
  size?: number;
  className?: string;
  'aria-label'?: string;
};

/**
 * Marca Vidya: V y X entrelazadas sobre un prisma hexagonal (vista cenital).
 * Degradado azul zafiro → cian.
 */
export function LogoVidya({ size = 36, className, 'aria-label': ariaLabel = APP_NAME }: Props) {
  const rawId = useId();
  const gid = `vidya-grad-${rawId.replace(/:/g, '')}`;

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

      <path
        d="M32 6 L52 17.5 L52 40.5 L32 52 L12 40.5 L12 17.5 Z"
        stroke={`url(#${gid})`}
        strokeWidth="2.25"
        strokeLinejoin="round"
        fill="none"
        opacity={0.95}
      />

      <path
        d="M12 17.5 L32 52 L52 17.5"
        stroke={`url(#${gid})`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

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
