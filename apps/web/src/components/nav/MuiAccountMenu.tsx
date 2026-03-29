import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { LogOut, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ShellUser } from '../../layouts/shellContext';

type Props = {
  user?: ShellUser;
  onLogout: () => void;
  onNavigate?: () => void;
};

export function MuiAccountMenu({ user, onLogout, onNavigate }: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const initial =
    user?.name?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    '?';

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        size="small"
        aria-label="Cuenta"
        aria-controls={open ? 'account-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{ border: '1px solid', borderColor: 'divider', p: 0.5 }}
      >
        {user?.picture ? (
          <Avatar src={user.picture} alt="" sx={{ width: 36, height: 36 }} />
        ) : (
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>{initial}</Avatar>
        )}
      </IconButton>
      <Menu
        id="account-menu"
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
          Sesión
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ px: 2, pb: 1 }}>
          {user?.name ?? user?.email ?? 'Usuario'}
        </Typography>
        {user?.email && user?.name ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1, display: 'block' }}>
            {user.email}
          </Typography>
        ) : null}
        <Divider />
        <MenuItem
          component={Link}
          to="/perfil"
          onClick={() => {
            setAnchor(null);
            onNavigate?.();
          }}
        >
          <ListItemIcon>
            <User size={18} />
          </ListItemIcon>
          Perfil
        </MenuItem>
        <MenuItem
          component={Link}
          to="/ajustes"
          onClick={() => {
            setAnchor(null);
            onNavigate?.();
          }}
        >
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          Ajustes
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onNavigate?.();
            onLogout();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <LogOut size={18} />
          </ListItemIcon>
          Cerrar sesión
        </MenuItem>
      </Menu>
    </>
  );
}
