import { Chip, Typography } from '@mui/material';
import { Building2 } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import type { BankBalanceRow } from '../api/fetchAccounts';
import { MoneyText } from '../components/shared/MoneyText';
import { formatMoney } from '../lib/formatMoney';

type Props = {
  banks: BankBalanceRow[];
  currencyCode: string;
};

export function BankBalancesRow({ banks, currencyCode }: Props) {
  if (banks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay cuentas bancarias en tu moneda por defecto. Crea una cuenta tipo banco para ver el desglose.
      </Typography>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {banks.map((b) => (
        <Chip
          key={b.id}
          component={RouterLink}
          to={`/cuentas/${b.id}`}
          clickable
          icon={<Building2 size={16} />}
          label={
            <span className="flex items-center gap-1">
              {b.name} · <MoneyText>{formatMoney(b.balance, currencyCode)}</MoneyText>
            </span>
          }
          variant="outlined"
          sx={{ fontWeight: 600, textDecoration: 'none' }}
        />
      ))}
    </div>
  );
}
