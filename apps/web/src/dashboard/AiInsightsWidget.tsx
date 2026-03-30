import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { Sparkles } from 'lucide-react';
import type { DashboardDataSnapshot } from '../hooks/useDashboard';

type Props = {
  data: DashboardDataSnapshot;
};

const pulseSoft = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.2);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.04);
    box-shadow: 0 0 0 10px rgba(99, 102, 241, 0.07);
  }
`;

const bubbleIcons = [LightbulbOutlinedIcon, ShowChartOutlinedIcon, SavingsOutlinedIcon] as const;

export function AiInsightsWidget({ data }: Props) {
  return (
    <Card
      sx={{
        borderRadius: '20px',
        border: 'none',
        bgcolor: 'transparent',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          p: { xs: 2.5, sm: 3 },
          borderRadius: '20px',
          border: '1px solid rgba(129, 140, 248, 0.28)',
          borderLeftWidth: 4,
          borderLeftColor: 'primary.main',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              flexShrink: 0,
              bgcolor: 'rgba(255,255,255,0.1)',
              color: 'primary.main',
              animation: `${pulseSoft} 2.8s ease-in-out infinite`,
            }}
          >
            <Sparkles size={20} strokeWidth={2} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" fontWeight={700} sx={{ lineHeight: 1.2, letterSpacing: '0.08em', color: '#94a3b8' }}>
              IA financiera
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.25, color: '#ffffff' }}>
              Consejos según tus gastos
            </Typography>
          </Box>
        </Stack>

        <Stack component="ul" spacing={2.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {data.aiTips.map((tip, i) => {
            const Icon = bubbleIcons[i % bubbleIcons.length];
            return (
              <Box
                component="li"
                key={i}
                sx={{
                  display: 'flex',
                  gap: 1.75,
                  alignItems: 'flex-start',
                  px: 2,
                  py: 2,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <Box
                  sx={{
                    mt: 0.15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    flexShrink: 0,
                    bgcolor: alpha('#6366f1', 0.12),
                    color: 'primary.light',
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    lineHeight: 1.65,
                    fontWeight: 500,
                    letterSpacing: '-0.35px',
                    color: '#ffffff',
                  }}
                >
                  {tip}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
