import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addInvestmentTier, createTieredStrategy } from '../../api/fetchInvestments';
import { useTransaction } from '../../hooks/useTransaction';

type TierRow = { id: string; upperLimit: string; annualRatePct: string };

function newTier(): TierRow {
  return { id: crypto.randomUUID(), upperLimit: '', annualRatePct: '' };
}

type Props = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function TieredStrategyDialog({ open, onClose, getAccessToken, onSaved }: Props) {
  const { run } = useTransaction();
  const [name, setName] = useState('');
  const [tiers, setTiers] = useState<TierRow[]>([newTier()]);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTiers([newTier()]);
      setSubmitErr(null);
    }
  }, [open]);

  function addTier() {
    setTiers((rows) => [...rows, newTier()]);
  }

  function removeTier(id: string) {
    setTiers((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  function patchTier(id: string, patch: Partial<TierRow>) {
    setTiers((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    setSubmitErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setSubmitErr('Indica el nombre de la estrategia.');
      return;
    }
    for (let i = 0; i < tiers.length; i++) {
      const pct = parseFloat(tiers[i].annualRatePct.replace(',', '.'));
      if (!Number.isFinite(pct) || pct < 0) {
        setSubmitErr(`Tramo ${i + 1}: indica un porcentaje anual válido (0 o mayor).`);
        return;
      }
    }

    const result = await run(
      async () => {
        const strategy = await createTieredStrategy(getAccessToken, { name: trimmed });
        for (let i = 0; i < tiers.length; i++) {
          const row = tiers[i];
          const raw = row.upperLimit.trim().replace(/,/g, '');
          let upperLimit: number | null = null;
          if (raw !== '') {
            const ul = Number(raw);
            if (!Number.isFinite(ul) || ul < 0) {
              throw new Error(`Tramo ${i + 1}: el límite superior no es válido.`);
            }
            upperLimit = ul;
          }
          const annualRatePct = parseFloat(row.annualRatePct.replace(',', '.'));
          await addInvestmentTier(getAccessToken, strategy.id, {
            sortOrder: i,
            upperLimit,
            annualRatePct,
          });
        }
        return strategy;
      },
      {
        loadingMessage: 'Creando estrategia y tramos…',
        successMessage: '✅ Estrategia por tramos creada',
        successDescription: trimmed,
      },
    );

    if (result !== undefined) {
      await onSaved();
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Estrategia de interés por tramos</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Nombre de la estrategia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="Ej. CETES escalonados"
          />
          <Typography variant="caption" color="text.secondary">
            Define tramos en orden: límite acumulado máximo del tramo (vacío = sin techo en el último) y tasa
            nominal anual %.
          </Typography>

          {submitErr ? (
            <Alert severity="error" variant="outlined">
              {submitErr}
            </Alert>
          ) : null}

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
                label="Límite"
                value={row.upperLimit}
                onChange={(e) => patchTier(row.id, { upperLimit: e.target.value })}
                fullWidth
                placeholder={index === tiers.length - 1 ? 'Vacío = sin techo' : 'Ej. 100000'}
                helperText="Tope acumulado del tramo"
              />
              <TextField
                label="Porcentaje"
                value={row.annualRatePct}
                onChange={(e) => patchTier(row.id, { annualRatePct: e.target.value })}
                fullWidth
                required
                placeholder="% anual nominal"
                inputProps={{ inputMode: 'decimal' }}
              />
              <IconButton
                aria-label="Eliminar tramo"
                onClick={() => removeTier(row.id)}
                disabled={tiers.length <= 1}
                color="inherit"
                sx={{ mt: { xs: 0, sm: 0.5 } }}
              >
                <Trash2 size={18} />
              </IconButton>
            </Box>
          ))}

          <Button type="button" variant="outlined" startIcon={<Plus size={18} />} onClick={addTier} sx={{ alignSelf: 'flex-start' }}>
            + Añadir Tramo
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()}>
          Guardar estrategia
        </Button>
      </DialogActions>
    </Dialog>
  );
}
