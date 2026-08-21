import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth';
import { getDateRange, formatNumber, formatPercent } from '@/lib/utils';
import { getHourlyPerformance, getHostessPerformance, getPerformanceData } from '@/lib/analytics/queries';
import { computeHighlights, computeLossReasonBreakdown, APP_TIMEZONE } from '@/lib/analytics/highlights';
import type { RawApproachRow } from '@/lib/analytics/highlights';
import type { HostessPerformance, HourlyPerformance } from '@/src/types';
import DashboardFilters from './filters';
import HourlyChart from './hourly-chart';
import PerformanceOverview from './performance-overview';

type PageProps = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

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

  const filters = { ...dateRange, campaignId, unitId, hostessId };

  const [perfRows, hourly, hostessPerf] = await Promise.all([
    getPerformanceData(filters).catch(() => [] as RawApproachRow[]),
    getHourlyPerformance(filters).catch(() => [] as HourlyPerformance[]),
    getHostessPerformance(filters).catch(() => [] as HostessPerformance[]),
  ]);

  // General highlights
  const general = computeHighlights(perfRows, APP_TIMEZONE);

  // Per-unit highlights — group rows by unit_id, sorted by approach count desc
  const unitMap = new Map<string, { name: string; rows: typeof perfRows }>();
  for (const row of perfRows) {
    const existing = unitMap.get(row.unit_id) ?? { name: row.unit_name, rows: [] };
    existing.rows.push(row);
    unitMap.set(row.unit_id, existing);
  }
  const units = Array.from(unitMap.entries())
    .map(([unitId, { name, rows }]) => ({
      unitId,
      unitName: name,
      metrics: computeHighlights(rows, APP_TIMEZONE),
    }))
    .sort((a, b) => b.metrics.approaches - a.metrics.approaches);

  const lossBreakdown = computeLossReasonBreakdown(perfRows);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Visão geral das abordagens</p>
      </div>

      {/* Filters */}
      <Suspense>
        <DashboardFilters activePreset={preset} />
      </Suspense>

      {/* ── VISÃO GERAL ── */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Visão Geral
        </h2>
        <PerformanceOverview data={general} />
      </section>

      {/* ── DESEMPENHO POR UNIDADE ── */}
      {units.length > 0 && (
        <section className="mt-8 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Desempenho por Unidade
          </h2>
          {units.map((unit) => (
            <div
              key={unit.unitId}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-6"
            >
              <details className="group" open>
                <summary className="flex items-center gap-3 cursor-pointer list-none select-none mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-base font-semibold text-zinc-50">{unit.unitName}</span>
                  <span className="text-sm text-zinc-400">
                    {formatNumber(unit.metrics.approaches)} abordagens
                  </span>
                  <svg
                    className="ml-auto h-4 w-4 text-zinc-400 shrink-0 transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <PerformanceOverview data={unit.metrics} />
              </details>
            </div>
          ))}
        </section>
      )}

      {/* ── ANÁLISES DETALHADAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Hostess table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-50 mb-4">Desempenho por Hostess</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 uppercase text-xs border-b border-zinc-800">
                <th className="text-left py-2 px-3 font-semibold tracking-wide">Hostess</th>
                <th className="text-right py-2 px-3 font-semibold tracking-wide">Abordagens</th>
                <th className="text-right py-2 px-3 font-semibold tracking-wide">Entrou</th>
                <th className="text-right py-2 px-3 font-semibold tracking-wide">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {(hostessPerf as HostessPerformance[]).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    Nenhum dado encontrado
                  </td>
                </tr>
              ) : (
                (hostessPerf as HostessPerformance[]).map((h, i) => {
                  const entrou = Math.round(h.approaches * h.group_conversion_rate / 100);
                  return (
                    <tr key={i} className="border-b border-zinc-800">
                      <td className="py-2.5 px-3 text-zinc-50">{h.hostess_name}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">{h.approaches}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">{entrou}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">{formatPercent(h.group_conversion_rate)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Loss reasons table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-50 mb-4">Motivos de Rejeição</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 uppercase text-xs border-b border-zinc-800">
                <th className="text-left py-2 px-3 font-semibold tracking-wide">Motivo</th>
                <th className="text-right py-2 px-3 font-semibold tracking-wide">Grupos</th>
                <th className="text-right py-2 px-3 font-semibold tracking-wide">%</th>
              </tr>
            </thead>
            <tbody>
              {lossBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-zinc-500">
                    Nenhum dado encontrado
                  </td>
                </tr>
              ) : (
                lossBreakdown.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td className="py-2.5 px-3 text-zinc-50">{r.loss_reason_name}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-400">{r.groups}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-400">
                      {formatPercent(r.percentage)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── HOURLY CHART (unchanged) ── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mt-6">
        <h2 className="text-base font-semibold text-zinc-50 mb-4">Abordagens por Hora</h2>
        <HourlyChart data={hourly as HourlyPerformance[]} />
      </div>
    </div>
  );
}
