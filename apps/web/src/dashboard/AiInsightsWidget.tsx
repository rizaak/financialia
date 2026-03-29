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
        borderRadius: '16px',
        border: 'none',
        bgcolor: 'transparent',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={(theme) => ({
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          p: { xs: 2.5, sm: 3 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor:
            theme.palette.mode === 'dark' ? 'rgba(129, 140, 248, 0.35)' : 'rgba(99, 102, 241, 0.22)',
          borderLeftWidth: 4,
          borderLeftColor: 'primary.main',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(155deg, rgba(49, 46, 129, 0.55) 0%, rgba(30, 27, 75, 0.92) 50%, rgba(15, 23, 42, 0.98) 100%)'
              : 'linear-gradient(155deg, rgba(238, 242, 255, 0.98) 0%, rgba(245, 243, 255, 0.96) 45%, rgba(253, 244, 255, 0.94) 100%)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 4px 24px rgba(79, 70, 229, 0.08)',
        })}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              flexShrink: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              color: 'primary.main',
              boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 4px rgba(79, 70, 229, 0.12)',
              animation: `${pulseSoft} 2.8s ease-in-out infinite`,
            })}
          >
            <Sparkles size={20} strokeWidth={2} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              fontWeight={700}
              sx={(t) => ({
                lineHeight: 1.2,
                letterSpacing: '0.08em',
                color: t.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
              })}
            >
              IA financiera
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={(t) => ({
                lineHeight: 1.25,
                color: t.palette.mode === 'dark' ? 'grey.50' : 'text.primary',
              })}
            >
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
                sx={(theme) => ({
                  display: 'flex',
                  gap: 1.75,
                  alignItems: 'flex-start',
                  px: 2,
                  py: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.common.white, 0.1)
                      : alpha(theme.palette.primary.main, 0.12),
                  background:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.common.white, 0.06)
                      : alpha(theme.palette.background.paper, 0.72),
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
                      : '0 2px 12px rgba(79, 70, 229, 0.06)',
                })}
              >
                <Box
                  sx={(theme) => ({
                    mt: 0.15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    flexShrink: 0,
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.light, 0.12)
                        : alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.light',
                  })}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={(theme) => ({
                    flex: 1,
                    minWidth: 0,
                    lineHeight: 1.65,
                    fontWeight: 500,
                    letterSpacing: '-0.35px',
                    color: theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900',
                  })}
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
