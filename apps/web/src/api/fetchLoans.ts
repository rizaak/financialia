import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type LoanKind = 'PERSONAL' | 'MORTGAGE';

export type LoanSummaryRow = {
  id: string;
  kind: LoanKind;
  name: string;
  totalAmount: string;
  currentBalance: string;
  interestRateAnnual: string;
  termMonths: number;
  monthlyPayment: string;
  startDate: string;
  currency: string;
  status: string;
  principalPaid: string;
  percentPrincipalPaid: number;
  cumulativeInterestPaid: string;
  cumulativeInsurancePaid: string;
};

export type LoansDashboardSummary = {
  loans: LoanSummaryRow[];
  aggregate: {
    totalPrincipalRemaining: string;
    totalCumulativeInterestPaid: string;
    totalCumulativeInsurancePaid: string;
    monthlyDebtService: string;
  };
  prepaymentScenarios: Array<{
    loanId: string;
    name: string;
    kind: string;
    currency: string;
    candidates: Array<{
      extraPrincipal: string;
      monthsSavedApprox: number;
      interestSavedApprox: string;
    }>;
  }>;
};

export type AmortizationScheduleRow = {
  month: number;
  payment: string;
  interest: string;
  principal: string;
  balanceAfter: string;
};

export type AmortizationScheduleApi = {
  loanId: string;
  name: string;
  currency: string;
  principal: string;
  annualRate: string;
  termMonths: number;
  fixedMonthlyPayment: string;
  rows: AmortizationScheduleRow[];
};

export type PrepaymentStrategy = 'REDUCE_TERM' | 'REDUCE_PAYMENT';

export type ExtraPaymentSimulation = {
  loanId: string;
  currency: string;
  extraAmount: string;
  strategy: PrepaymentStrategy;
  amortizationMethod: 'FRENCH_FIXED_PAYMENT';
  simulationAsOf: string;
  originalContractEndApprox: string;
  withoutExtra: {
    monthsRemaining: number;
    totalInterestFuture: string;
    estimatedPayoffDate: string;
  };
  withExtra: {
    monthsRemaining: number;
    totalInterestFuture: string;
    estimatedPayoffDate: string;
    newMonthlyPayment?: string;
  };
  savings: {
    totalInterestSaved: string;
    monthsSaved: number;
    newEndDate: string;
  };
};

export async function simulateExtraPayment(
  getAccessToken: () => Promise<string>,
  loanId: string,
  extraAmount: number,
  strategy: PrepaymentStrategy = 'REDUCE_TERM',
): Promise<ExtraPaymentSimulation> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/loans/${loanId}/simulate-extra`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ extraAmount, strategy }),
  });
  await assertOk(res);
  return res.json() as Promise<ExtraPaymentSimulation>;
}

export async function fetchAmortizationSchedule(
  getAccessToken: () => Promise<string>,
  loanId: string,
): Promise<AmortizationScheduleApi> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/loans/${loanId}/amortization-schedule`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<AmortizationScheduleApi>;
}

export async function fetchLoansSummary(
  getAccessToken: () => Promise<string>,
): Promise<LoansDashboardSummary> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/loans/summary`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<LoansDashboardSummary>;
}
