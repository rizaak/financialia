'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { fetchPositionValueHistory, recordPositionMarketValue } from '../../api/fetchInvestments';
import { formatMoney } from '../../lib/formatMoney';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = {
  open: boolean;
  onClose: () => void;
  positionId: string;
  label: string;
  initialAmount: number;
  currencyCode: string;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function MarketValueDialog({
  open,
  onClose,
  positionId,
  label,
  initialAmount,
  currencyCode,
  getAccessToken,
  onSaved,
}: Props) {
  const [mv, setMv] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ t: string; v: number }>>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchPositionValueHistory(getAccessToken, positionId);
        if (cancelled) return;
        setHistory(
          rows.map((r) => ({
            t: new Date(r.recordedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            v: Number(r.marketValue),
          })),
        );
      } catch {
        setHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, positionId, getAccessToken]);

  async function submit() {
    setErr(null);
    const n = Number(String(mv).replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) {
      setErr('Valor inválido.');
      return;
    }
    setBusy(true);
    try {
      await recordPositionMarketValue(getAccessToken, positionId, n);
      setMv('');
      await onSaved();
      const rows = await fetchPositionValueHistory(getAccessToken, positionId);
      setHistory(
        rows.map((r) => ({
          t: new Date(r.recordedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          v: Number(r.marketValue),
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Valor de mercado · {label}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Capital invertido: {formatMoney(String(initialAmount), currencyCode)}
        </Typography>
        <TextField
          fullWidth
          label="Valor actual en mercado"
          value={mv}
          onChange={(e) => setMv(e.target.value)}
          disabled={busy}
          sx={{ mb: 2 }}
        />
        {err ? (
          <Typography variant="caption" color="error">
            {err}
          </Typography>
        ) : null}
        {history.length > 0 ? (
          <Box sx={{ width: '100%', height: 220, mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Historial (capital vs. tiempo)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatMoney(String(v), currencyCode)}
                  width={72}
                />
                <Tooltip
                  formatter={(v: number) => [formatMoney(String(v), currencyCode), 'Valor']}
                  labelFormatter={(l) => String(l)}
                />
                <Line type="monotone" dataKey="v" stroke="#059669" strokeWidth={2} dot={false} name="Valor" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
            Tras el primer registro aparecerá la gráfica de evolución.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cerrar
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={busy}>
          Guardar valor
        </Button>
      </DialogActions>
    </Dialog>
  );
}
