import { Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import { NavLink } from 'react-router-dom';
import type { VanSidebarStatus } from '../../hooks/useVanSidebarStatus';
import { APP_NAME, APP_TAGLINE } from '../../config/brandConfig';
import { LogoVidya } from '../brand/LogoVidya';
import { cn } from '../../lib/utils';
import type { SidebarNavItem } from './sidebarNavConfig';
import { VanSidebarStatus as VanSidebarStatusBlock } from './VanSidebarStatus';

type Props = {
  items: SidebarNavItem[];
  showMini: boolean;
  onNavigate?: () => void;
  vanStatus?: VanSidebarStatus;
};

export function SidebarNav({ items, showMini, onNavigate, vanStatus }: Props) {
  const van = vanStatus ?? { showNotification: false, message: 'Vi está analizando tus tramos…' };

  return (
    <Box className="flex h-full flex-col py-2">
      <Box className={cn('mb-2 border-b border-white/10 pb-2', showMini ? 'px-2' : 'px-3')}>
        {!showMini ? (
          <>
            <Box className="flex items-center gap-2 px-1">
              <LogoVidya size={32} />
              <Typography
                component="h2"
                className="text-[1.05rem] tracking-[0.06em] text-zinc-100"
                sx={{ fontWeight: 500, letterSpacing: '0.08em', fontFamily: 'inherit' }}
              >
                {APP_NAME}
              </Typography>
            </Box>
            <Typography variant="caption" className="mt-1 block px-1 pl-2 font-normal text-zinc-400">
              {APP_TAGLINE}
            </Typography>
          </>
        ) : (
          <Box className="flex justify-center px-1">
            <Tooltip title={APP_NAME} placement="right">
              <span className="inline-flex">
                <LogoVidya size={30} />
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>

      <VanSidebarStatusBlock
        showNotification={van.showNotification}
        message={van.message}
        compact={showMini}
      />

      <List component="nav" aria-label="Principal" disablePadding className="px-2">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className="block w-full no-underline"
              style={{ color: 'inherit' }}
            >
              {({ isActive }) => (
                <ListItemButton
                  component="div"
                  disableRipple
                  className={cn('mb-0.5 rounded-lg py-2.5 transition-colors', showMini ? 'justify-center px-2' : 'px-3')}
                  sx={{
                    borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
                    ...(isActive
                      ? {
                          backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
                          color: '#ffffff !important',
                          boxShadow: 'inset 0 0 10px rgba(59, 130, 246, 0.2)',
                        }
                      : {
                          color: 'rgba(148, 163, 184, 0.95)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          },
                        }),
                  }}
                >
                  {showMini ? (
                    <Tooltip title={item.label} placement="right">
                      <ListItemIcon className="min-w-0 justify-center">
                        <Icon
                          size={20}
                          strokeWidth={2}
                          className="shrink-0"
                          style={{ color: isActive ? '#60a5fa' : '#64748b' }}
                          aria-hidden
                        />
                      </ListItemIcon>
                    </Tooltip>
                  ) : (
                    <ListItemIcon className="min-w-[40px] justify-center">
                      <Icon
                        size={20}
                        strokeWidth={2}
                        className="shrink-0"
                        style={{ color: isActive ? '#60a5fa' : '#64748b' }}
                        aria-hidden
                      />
                    </ListItemIcon>
                  )}
                  {!showMini ? (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.9rem',
                        sx: isActive
                          ? { color: '#ffffff !important' }
                          : { color: 'rgba(148, 163, 184, 0.95)' },
                      }}
                    />
                  ) : null}
                </ListItemButton>
              )}
            </NavLink>
          );
        })}
      </List>
    </Box>
  );
}
