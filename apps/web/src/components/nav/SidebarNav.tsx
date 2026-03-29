import { Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { LogoVantix } from '../brand/LogoVantix';
import { cn } from '../../lib/utils';
import type { SidebarNavItem } from './sidebarNavConfig';

type Props = {
  items: SidebarNavItem[];
  showMini: boolean;
  onNavigate?: () => void;
};

export function SidebarNav({ items, showMini, onNavigate }: Props) {
  return (
    <Box className="flex h-full flex-col py-2">
      <Box className={cn('mb-3 border-b border-slate-200/90 pb-3', showMini ? 'px-2' : 'px-4')}>
        {!showMini ? (
          <>
            <Box className="flex items-center gap-2">
              <LogoVantix size={32} />
              <Typography
                component="h2"
                className="text-base font-semibold tracking-tight text-slate-950"
                sx={{ fontWeight: 700 }}
              >
                Vantix
              </Typography>
            </Box>
            <Typography variant="caption" className="mt-1 block pl-1 text-slate-600">
              Inteligencia financiera
            </Typography>
          </>
        ) : (
          <Box className="flex justify-center px-1">
            <Tooltip title="Vantix" placement="right">
              <span className="inline-flex">
                <LogoVantix size={30} />
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>

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
                  className={cn(
                    'mb-0.5 rounded-lg border-l-2 py-2.5 transition-colors',
                    isActive
                      ? 'border-primary bg-slate-50/90 text-slate-900'
                      : 'border-transparent text-slate-600 hover:bg-slate-100',
                    showMini ? 'justify-center px-2' : 'px-3',
                  )}
                >
                  {showMini ? (
                    <Tooltip title={item.label} placement="right">
                      <ListItemIcon className="min-w-0 justify-center" sx={{ color: 'inherit' }}>
                        <Icon
                          size={20}
                          strokeWidth={2}
                          className={cn('shrink-0', isActive ? 'text-primary' : 'text-slate-500')}
                          aria-hidden
                        />
                      </ListItemIcon>
                    </Tooltip>
                  ) : (
                    <ListItemIcon className="min-w-[40px] justify-center" sx={{ color: 'inherit' }}>
                      <Icon
                        size={20}
                        strokeWidth={2}
                        className={cn('shrink-0', isActive ? 'text-primary' : 'text-slate-500')}
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
