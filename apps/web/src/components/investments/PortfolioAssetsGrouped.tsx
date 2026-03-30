'use client';

import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import CurrencyBitcoin from '@mui/icons-material/CurrencyBitcoin';
import PieChartOutline from '@mui/icons-material/PieChartOutline';
import ShowChart from '@mui/icons-material/ShowChart';
import { Box, Button, List, ListItem, ListItemIcon, Stack, Typography } from '@mui/material';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { type ComponentType, useMemo, useState } from 'react';
import type { InvestmentAsset, PortfolioCategoryId } from '../../investments/investmentDashboardTypes';
import { MarketValueDialog } from './MarketValueDialog';

type Props = {
  assets: InvestmentAsset[];
  formatCurrency: (value: number, code: string) => string;
  currencyCode: string;
  getAccessToken: () => Promise<string>;
  onMarketValueSaved: () => void | Promise<void>;
};

/** Estilo lujo / cristal para listas de activos (Gestión de portafolio). */
export const portfolioAssetsListSx = {
  backgroundColor: 'transparent !important',
  '& .MuiListItem-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.03) !important',
    marginBottom: '8px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  '& .MuiListItem-root:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
  },
  '& .MuiTypography-root': {
    color: '#ffffff !important',
  },
  '& .MuiTypography-secondary': {
    color: '#94a3b8 !important',
  },
  '& .MuiListItemText-secondary': {
    color: '#94a3b8 !important',
  },
  '& .MuiTypography-colorTextSecondary': {
    color: '#94a3b8 !important',
  },
} as const;

const CATEGORY_ASSET_ICON: Record<
  PortfolioCategoryId,
  { Icon: ComponentType<SvgIconProps>; color: string }
> = {
  cripto: { Icon: CurrencyBitcoin, color: '#f7931a' },
  acciones: { Icon: ShowChart, color: '#38bdf8' },
  etfs: { Icon: PieChartOutline, color: '#34d399' },
  efectivo: { Icon: AccountBalanceWallet, color: '#a78bfa' },
};

const actionButtonSx = {
  borderColor: 'rgba(255, 255, 255, 0.22)',
  color: '#ffffff',
  backgroundColor: 'transparent',
  textTransform: 'none' as const,
  fontWeight: 600,
  '&:hover': {
    borderColor: 'rgba(56, 189, 248, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
};

function isBrokerStyleLabel(name: string): boolean {
  const l = name.toLowerCase();
  return /\b(gbm|bitso|gbm\+|plusvalía|plusvalia)\b/.test(l) || l.includes('gbm') || l.includes('bitso');
}

function AssetCategoryIcon({ category }: { category: PortfolioCategoryId }) {
  const { Icon, color } = CATEGORY_ASSET_ICON[category];
  return (
    <ListItemIcon
      sx={{
        minWidth: 48,
        color,
        opacity: 1,
        '& .MuiSvgIcon-root': { fontSize: 28, opacity: 1, color: 'inherit' },
      }}
    >
      <Icon />
    </ListItemIcon>
  );
}

export function PortfolioAssetsGrouped({
  assets,
  formatCurrency,
  currencyCode,
  getAccessToken,
  onMarketValueSaved,
}: Props) {
  const fixed = useMemo(() => assets.filter((a) => a.kind === 'FIXED_TERM'), [assets]);
  const variable = useMemo(() => assets.filter((a) => a.kind === 'VARIABLE'), [assets]);

  const [mvOpen, setMvOpen] = useState(false);
  const [mvPos, setMvPos] = useState<InvestmentAsset | null>(null);

  if (assets.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#94a3b8]">No hay activos en tus portafolios.</p>
    );
  }

  return (
    <Stack spacing={4}>
      <Box sx={{ backgroundColor: 'transparent' }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
          Instrumentos de plazo fijo (CETES, pagarés)
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: '#94a3b8' }}>
          Tasa pactada y fecha de vencimiento obligatorias al registrar la posición como plazo fijo.
        </Typography>
        {fixed.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">Sin posiciones de plazo fijo.</p>
        ) : (
          <Box sx={portfolioAssetsListSx}>
            <List disablePadding>
              {fixed.map((a) => (
                <ListItem key={a.id} alignItems="flex-start" sx={{ py: 2, px: 2 }}>
                  <AssetCategoryIcon category={a.category} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: '1fr 1fr',
                          md: 'minmax(0,1.3fr) minmax(0,0.85fr) minmax(0,0.75fr) minmax(0,0.75fr) minmax(0,0.7fr) minmax(0,0.7fr)',
                        },
                        gap: { xs: 1, md: 1.5 },
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                        {a.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {a.portfolioName}
                      </Typography>
                      <Typography variant="body2" sx={{ textAlign: { md: 'right' }, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(a.amountInvested, currencyCode)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: { md: 'right' }, fontVariantNumeric: 'tabular-nums' }}>
                        {a.maturityDate ? a.maturityDate.slice(0, 10) : '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ textAlign: { md: 'right' }, fontVariantNumeric: 'tabular-nums' }}>
                        {a.agreedAnnualRatePct != null ? `${(a.agreedAnnualRatePct * 100).toFixed(2)}%` : '—'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: { md: 'right' },
                          fontVariantNumeric: 'tabular-nums',
                          color: '#6ee7b7 !important',
                        }}
                      >
                        {a.growthPctVsInitial >= 0 ? '+' : ''}
                        {a.growthPctVsInitial.toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>

      <Box sx={{ backgroundColor: 'transparent' }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
          Renta variable (acciones, cripto, brokers)
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: '#94a3b8' }}>
          Capital invertido vs valor de mercado y plusvalía. En GBM/Bitso puedes actualizar el valor y guardar historial
          para la gráfica.
        </Typography>
        {variable.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">Sin posiciones de renta variable.</p>
        ) : (
          <Box sx={portfolioAssetsListSx}>
            <List disablePadding>
              {variable.map((a) => {
                const pl = a.unrealizedPlPct ?? a.growthPctVsInitial;
                const pos = pl >= 0;
                const showBrokerBtn = isBrokerStyleLabel(a.name);
                return (
                  <ListItem key={a.id} alignItems="flex-start" sx={{ py: 2, px: 2 }}>
                    <AssetCategoryIcon category={a.category} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr',
                            md: 'minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.75fr) minmax(0,0.75fr) minmax(0,0.65fr) auto',
                          },
                          gap: { xs: 1, md: 1.5 },
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={800} sx={{ wordBreak: 'break-word' }}>
                          {a.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {a.portfolioName}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: { md: 'right' }, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(a.amountInvested, currencyCode)}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: { md: 'right' }, fontVariantNumeric: 'tabular-nums' }}>
                          {a.marketValue != null ? formatCurrency(a.marketValue, currencyCode) : '—'}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            textAlign: { md: 'right' },
                            fontVariantNumeric: 'tabular-nums',
                            color: `${pos ? '#6ee7b7' : '#fca5a5'} !important`,
                          }}
                        >
                          {pos ? '+' : ''}
                          {pl.toFixed(2)}%
                        </Typography>
                        <Box sx={{ justifySelf: { xs: 'stretch', md: 'end' } }}>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            sx={{ ...actionButtonSx, minWidth: { md: 132 } }}
                            onClick={() => {
                              setMvPos(a);
                              setMvOpen(true);
                            }}
                          >
                            {showBrokerBtn ? 'Actualizar valor' : 'Valor mercado'}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </Box>

      {mvPos ? (
        <MarketValueDialog
          open={mvOpen}
          onClose={() => {
            setMvOpen(false);
            setMvPos(null);
          }}
          positionId={mvPos.id}
          label={mvPos.name}
          initialAmount={mvPos.amountInvested}
          currencyCode={currencyCode}
          getAccessToken={getAccessToken}
          onSaved={onMarketValueSaved}
        />
      ) : null}
    </Stack>
  );
}
