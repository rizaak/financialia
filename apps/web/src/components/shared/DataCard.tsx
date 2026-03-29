import { Box, Card, CardContent, Typography } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

export type DataCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  /** Color de fondo del icono (tokens MUI `primary.main`, etc.). */
  iconBg?: 'primary.main' | 'success.main' | 'info.main' | 'warning.main' | 'error.main';
  subtitle?: string;
};

/**
 * Tarjeta KPI con icono Lucide (MUI Card).
 */
export function DataCard({ title, value, icon: Icon, iconBg = 'primary.main', subtitle }: DataCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: iconBg,
              color: 'primary.contrastText',
              flexShrink: 0,
            }}
          >
            <Icon size={22} strokeWidth={2} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h5" component="p" sx={{ mt: 0.5, fontWeight: 700, lineHeight: 1.2 }}>
              {value}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
