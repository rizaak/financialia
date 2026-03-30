import { Allow } from 'class-validator';

/** UUID de estrategia o `null` para quitar la configuración de cajita. */
export class PatchYieldAccountDto {
  @Allow()
  yieldStrategyId!: string | null;
}
