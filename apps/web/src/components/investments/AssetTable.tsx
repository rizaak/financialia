import type { InvestmentAsset } from '../../investments/investmentDashboardTypes';

type Props = {
  assets: InvestmentAsset[];
  formatCurrency: (value: number, code: string) => string;
  currencyCode: string;
};

export function AssetTable({ assets, formatCurrency, currencyCode }: Props) {
  if (assets.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">No hay activos en tus portafolios.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/80">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/80">
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">
              Activo
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-700">
              Portafolio
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-700">
              Invertido
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-700">
              % del total
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-700">
              Rend. anual (est.)
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-700">
              Δ 1 año (est.)
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => {
            const growthPositive = a.growthPctVsInitial >= 0;
            return (
              <tr
                key={a.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">{a.name}</td>
                <td className="px-4 py-3 text-zinc-600">{a.portfolioName}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-800">
                  {formatCurrency(a.amountInvested, currencyCode)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                  {a.portfolioSharePct.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                  {a.expectedAnnualReturnPct.toFixed(2)}%
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${
                    growthPositive ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {growthPositive ? '+' : ''}
                  {a.growthPctVsInitial.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-2 text-xs text-zinc-500">
        Porcentaje sobre el total invertido en el portafolio.
      </p>
    </div>
  );
}
