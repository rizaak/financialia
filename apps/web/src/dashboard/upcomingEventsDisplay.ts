import type { SvgIconComponent } from '@mui/icons-material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import LocalGasStationOutlinedIcon from '@mui/icons-material/LocalGasStationOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined';

/** Etiqueta relativa a partir de `YYYY-MM-DD` (calendario local del navegador). */
export function formatRelativeOccurrenceLabel(nextOccurrenceLocal: string): string {
  const parts = nextOccurrenceLocal.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return nextOccurrenceLocal;
  }
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff > 1) return `En ${diff} días`;
  if (diff === -1) return 'Ayer';
  return `Hace ${Math.abs(diff)} días`;
}

export function getCategoryIcon(slug?: string, name?: string): SvgIconComponent {
  const s = `${slug ?? ''} ${name ?? ''}`.toLowerCase();
  if (/(netflix|hbo|disney|prime|streaming|tv|spotify|apple\s*music|youtube)/.test(s)) {
    return LiveTvOutlinedIcon;
  }
  if (/(renta|rental|rent\b|hogar|vivienda|casa\b|mortgage|hipoteca)/.test(s)) {
    return HomeOutlinedIcon;
  }
  if (/(nómina|nomina|salario|sueldo|payroll|dep[oó]sito\s*fijo)/.test(s)) {
    return PaymentsOutlinedIcon;
  }
  if (/(comida|restaurant|restaurante|uber\s*eats|rappi)/.test(s)) {
    return RestaurantOutlinedIcon;
  }
  if (/(gasolina|gas\s|combustible|pemex|gasolin)/.test(s)) {
    return LocalGasStationOutlinedIcon;
  }
  if (/(super|mercado|walmart|costco|compra)/.test(s)) {
    return ShoppingCartOutlinedIcon;
  }
  if (/(suscrip|subscription|mensualidad)/.test(s)) {
    return SubscriptionsOutlinedIcon;
  }
  return CategoryOutlinedIcon;
}
