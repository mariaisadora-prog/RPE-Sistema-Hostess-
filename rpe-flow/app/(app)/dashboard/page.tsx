import { requireAuth } from '@/lib/auth';
import { getDateRange, formatPercent, formatNumber } from '@/lib/utils';
import {
  getDashboardSummary,
  getHourlyPerformance,
  getHostessPerformance,
  getLossReasonPerformance,
} from '@/lib/analytics/queries';
import type { PageProps } from 'next';
import type { HostessPerformance, LossReasonPerformance, HourlyPerformance } from '@/src/types';
import DashboardFilters from './filters';
import HourlyChart from './hourly-chart';
import { Suspense } from 'react';

export default async function DashboardPage({ searchParams }: PageProps) {
  await requireAuth();
  const sp = await searchParams;

  const campaignId = sp.campaignId as string | undefined;
  const unitId = sp.unitId as string | undefined;
  const hostessId = sp.hostessId as string | undefined;
  const preset = (sp.preset as string) || 'today';
  const startDate = sp.startDate as string | undefined;
  const endDate = sp.endDate as string | undefined;

  const dateRange =
    startDate && endDate ? { startDate, endDate } : getDateRange(preset);

  const filters = {
    ...dateRange,
    campaignId,
    unitId,
    hostessId,
  };

  const [summary, hourly, hostessPerf, lossReasons] = await Promise.all([
    getDashboardSummary(filters).catch(() => null),
    getHourlyPerformance(filters).catch(() => [] as HourlyPerformance[]),
    getHostessPerformance(filters).catch(() => [] as HostessPerformance[]),
    getLossReasonPerformance(filters).catch(() => [] as LossReasonPerformance[]),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Visão geral das abordagens</p>
      </div>

      {/* Filters */}
      <Suspense>
        <DashboardFilters activePreset={preset} />
      </Suspense>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <SummaryCard label="Abordagens" value={formatNumber(summary?.total_approaches ?? 0)} />
        <SummaryCard label="Pessoas" value={formatNumber(summary?.total_people ?? 0)} />
        <SummaryCard label="Taxa Grupos" value={formatPercent(summary?.group_conversion_rate ?? 0)} />
        <SummaryCard label="Taxa Pessoas" value={formatPercent(summary?.people_conversion_rate ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Hostess Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Desempenho por Hostess</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
                <th className="text-left py-2 px-3 font-medium">Hostess</th>
                <th className="text-right py-2 px-3 font-medium">Abord.</th>
                <th className="text-right py-2 px-3 font-medium">Pessoas</th>
                <th className="text-right py-2 px-3 font-medium">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {(hostessPerf as HostessPerformance[]).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400">
                    Nenhum dado encontrado
                  </td>
                </tr>
              ) : (
                (hostessPerf as HostessPerformance[]).map((h, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-2 px-3 text-zinc-900">{h.hostess_name}</td>
                    <td className="py-2 px-3 text-right text-zinc-700">{h.approaches}</td>
                    <td className="py-2 px-3 text-right text-zinc-700">{h.people_approached}</td>
                    <td className="py-2 px-3 text-right text-zinc-700">
                      {formatPercent(h.people_conversion_rate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Loss Reasons */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Motivos de Recusa</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
                <th className="text-left py-2 px-3 font-medium">Motivo</th>
                <th className="text-right py-2 px-3 font-medium">Grupos</th>
                <th className="text-right py-2 px-3 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {(lossReasons as LossReasonPerformance[]).length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-zinc-400">
                    Nenhum dado encontrado
                  </td>
                </tr>
              ) : (
                (lossReasons as LossReasonPerformance[]).map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-2 px-3 text-zinc-900">{r.loss_reason_name}</td>
                    <td className="py-2 px-3 text-right text-zinc-700">{r.groups}</td>
                    <td className="py-2 px-3 text-right text-zinc-700">
                      {formatPercent(r.percentage)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly chart */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 mt-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Abordagens por Hora</h2>
        <HourlyChart data={hourly as HourlyPerformance[]} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-3xl font-bold text-zinc-900 mt-1">{value}</p>
    </div>
  );
}
