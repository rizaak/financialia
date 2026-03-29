import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';

export type TierFieldRow = { id: string; upperLimit: string; annualRatePct: string };

type Props = {
  tiers: TierFieldRow[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onPatch: (id: string, patch: Partial<TierFieldRow>) => void;
};

export function InvestmentTierFields({ tiers, onAdd, onRemove, onPatch }: Props) {
  return (
    <>
      <Typography variant="subtitle2" fontWeight={700}>
        Tramos de interés
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Orden ascendente: límite acumulado máximo por tramo (el último puede ir sin techo). Tasas nominal anual
        %.
      </Typography>

      {tiers.map((row, index) => (
        <Box
          key={row.id}
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
            alignItems: 'flex-start',
          }}
        >
          <TextField
            label="Límite superior"
            value={row.upperLimit}
            onChange={(e) => onPatch(row.id, { upperLimit: e.target.value })}
            fullWidth
            placeholder={index === tiers.length - 1 ? 'Vacío = sin techo' : 'Ej. 100000'}
            helperText={index === tiers.length - 1 ? 'Último tramo: opcional' : 'Tope acumulado'}
          />
          <TextField
            label="% tasa anual"
            value={row.annualRatePct}
            onChange={(e) => onPatch(row.id, { annualRatePct: e.target.value })}
            fullWidth
            required
            inputProps={{ inputMode: 'decimal' }}
          />
          <IconButton
            aria-label="Eliminar tramo"
            onClick={() => onRemove(row.id)}
            disabled={tiers.length <= 1}
            color="inherit"
            sx={{ mt: { xs: 0, sm: 0.5 } }}
          >
            <Trash2 size={18} />
          </IconButton>
        </Box>
      ))}

      <Button type="button" variant="outlined" startIcon={<Plus size={18} />} onClick={onAdd} sx={{ alignSelf: 'flex-start' }}>
        Añadir tramo
      </Button>
    </>
  );
}
