import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca ruta o controlador como pública (sin JWT). Útil para health, webhooks, etc. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
