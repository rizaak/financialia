import type { InvestmentAsset } from '../../investments/investmentDashboardTypes';

type Props = {
  assets: InvestmentAsset[];
  formatCurrency: (value: number, code: string) => string;
  currencyCode: string;
};

export function AssetTable({ assets, formatCurrency, currencyCode }: Props) {
  if (assets.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#94a3b8]">No hay activos en tus portafolios.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-transparent backdrop-blur-[10px]">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-[rgba(255,255,255,0.02)]">
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-[#94a3b8]">
              Activo
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-[#94a3b8]">
              Portafolio
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#94a3b8]">
              Invertido
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#94a3b8]">
              % del total
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#94a3b8]">
              Rend. anual (est.)
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#94a3b8]">
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
                className="border-b border-white/[0.06] bg-transparent transition-colors last:border-0 hover:bg-white/[0.05]"
              >
                <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{a.portfolioName}</td>
                <td className="px-4 py-3 text-right tabular-nums text-white">
                  {formatCurrency(a.amountInvested, currencyCode)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#94a3b8]">
                  {a.portfolioSharePct.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white">
                  {a.expectedAnnualReturnPct.toFixed(2)}%
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${
                    growthPositive ? 'text-emerald-300' : 'text-rose-300'
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
      <p className="border-t border-white/10 bg-transparent px-4 py-2 text-xs text-[#94a3b8] backdrop-blur-[10px]">
        Porcentaje sobre el total invertido en el portafolio.
      </p>
    </div>
  );
}
