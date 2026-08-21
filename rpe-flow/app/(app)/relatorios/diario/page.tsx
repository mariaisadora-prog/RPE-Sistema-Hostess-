import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getDateRange, formatDate, formatPercent, formatNumber } from '@/lib/utils';
import { getPerformanceData, getHourlyPerformance, getHostessPerformance } from '@/lib/analytics/queries';
import { computeHighlights, computeLossReasonBreakdown, APP_TIMEZONE } from '@/lib/analytics/highlights';
import type { RawApproachRow } from '@/lib/analytics/highlights';
import type { HourlyPerformance } from '@/src/types';
import Link from 'next/link';

type PageProps = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function RelatorioDiarioPage({ searchParams }: PageProps) {
  await requireRole(['admin', 'manager']);
  const sp = await searchParams;
  const supabase = await createClient();

  const dateParam = sp.date as string | undefined;
  const campaignId = sp.campaignId as string | undefined;
  const unitId = sp.unitId as string | undefined;

  // Date range: use provided date or today
  let startDate: string;
  let endDate: string;
  let displayDate: string;

  if (dateParam) {
    const [y, m, d] = dateParam.split('-');
    displayDate = `${d}/${m}/${y}`;
    // Start and end of that day in UTC (approximate — proper timezone handled in utils)
    const dayStart = new Date(`${dateParam}T03:00:00.000Z`); // SP is UTC-3
    const dayEnd = new Date(`${dateParam}T02:59:59.999Z`);
    dayEnd.setDate(dayEnd.getDate() + 1);
    startDate = dayStart.toISOString();
    endDate = dayEnd.toISOString();
  } else {
    const range = getDateRange('today');
    startDate = range.startDate;
    endDate = range.endDate;
    displayDate = formatDate(new Date().toISOString(), 'dd/MM/yyyy');
  }

  const filters = { startDate, endDate, campaignId, unitId };

  // Fetch data
  const [perfRows, hourly, hostessPerf] = await Promise.all([
    getPerformanceData(filters).catch(() => [] as RawApproachRow[]),
    getHourlyPerformance(filters).catch(() => [] as HourlyPerformance[]),
    getHostessPerformance(filters).catch(() => []),
  ]);

  const highlights = computeHighlights(perfRows, APP_TIMEZONE);
  const lossBreakdown = computeLossReasonBreakdown(perfRows);

  // Fetch units and campaigns for filters
  const [{ data: units }, { data: campaigns }] = await Promise.all([
    supabase.from('units').select('id, name').eq('active', true).order('name'),
    supabase.from('campaigns').select('id, name').eq('active', true).order('name'),
  ]);

  const currentUnit = units?.find((u) => u.id === unitId);
  const currentCampaign = campaigns?.find((c) => c.id === campaignId);

  const totalApproaches = highlights.approaches;
  const entered = highlights.entered;
  const notEntered = highlights.notEntered;
  const convGroupRate = totalApproaches > 0 ? (entered / totalApproaches) * 100 : 0;

  // Best hour
  const bestHour = highlights.highestApproachHour;

  // Insights
  const insights: string[] = [];
  if (lossBreakdown[0] && totalApproaches > 0) {
    const topLoss = lossBreakdown[0];
    insights.push(
      `"${topLoss.loss_reason_name}" representou ${formatPercent(topLoss.percentage)} das recusas registradas.`
    );
  }
  if (bestHour) {
    insights.push(
      `O horário com mais abordagens foi ${bestHour.hourStart}h–${bestHour.hourEnd}h (${bestHour.approaches} abordagens).`
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Relatório Diário</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {currentUnit ? currentUnit.name : 'Todas as unidades'} — {displayDate}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Date / filter bar */}
      <div className="flex flex-wrap gap-3 mb-8">
        <input
          type="date"
          defaultValue={dateParam ?? new Date().toISOString().split('T')[0]}
          onChange={(e) => {
            if (e.target.value) window.location.href = `/relatorios/diario?date=${e.target.value}${unitId ? `&unitId=${unitId}` : ''}${campaignId ? `&campaignId=${campaignId}` : ''}`;
          }}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          defaultValue={unitId ?? ''}
          onChange={(e) => {
            const u = e.target.value;
            window.location.href = `/relatorios/diario?${dateParam ? `date=${dateParam}` : ''}${u ? `&unitId=${u}` : ''}${campaignId ? `&campaignId=${campaignId}` : ''}`;
          }}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas as unidades</option>
          {(units ?? []).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          defaultValue={campaignId ?? ''}
          onChange={(e) => {
            const c = e.target.value;
            window.location.href = `/relatorios/diario?${dateParam ? `date=${dateParam}` : ''}${unitId ? `&unitId=${unitId}` : ''}${c ? `&campaignId=${c}` : ''}`;
          }}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas as campanhas</option>
          {(campaigns ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {totalApproaches === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
          Nenhuma abordagem registrada para este período.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Abordagens', value: formatNumber(totalApproaches) },
              { label: 'Entraram', value: formatNumber(entered) },
              { label: 'Não entraram', value: formatNumber(notEntered) },
              { label: 'Conversão (grupos)', value: formatPercent(convGroupRate), highlight: true },
              { label: 'Campanha', value: currentCampaign?.name ?? '—' },
              { label: 'Unidade', value: currentUnit?.name ?? 'Todas' },
            ].map((item) => (
              <div
                key={item.label}
                className={`bg-zinc-900 rounded-xl border p-4 ${item.highlight ? 'border-emerald-800' : 'border-zinc-800'}`}
              >
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{item.label}</p>
                <p className={`text-2xl font-bold mt-1 ${item.highlight ? 'text-emerald-400' : 'text-zinc-50'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          {/* Insights */}
          {insights.length > 0 && (
            <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Destaques
              </h2>
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Motivos de rejeição */}
          {lossBreakdown.length > 0 && (
            <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                Motivos de Não Conversão
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 uppercase text-xs border-b border-zinc-800">
                    <th className="text-left py-2 font-semibold tracking-wide">Motivo</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Grupos</th>
                    <th className="text-right py-2 font-semibold tracking-wide">%</th>
                  </tr>
                </thead>
                <tbody>
                  {lossBreakdown.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-800 last:border-0">
                      <td className="py-2.5 text-zinc-200">{r.loss_reason_name}</td>
                      <td className="py-2.5 text-right text-zinc-400">{r.groups}</td>
                      <td className="py-2.5 text-right text-zinc-400">{formatPercent(r.percentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Abordagens por hora */}
          {(hourly as HourlyPerformance[]).length > 0 && (
            <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                Abordagens por Horário
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 uppercase text-xs border-b border-zinc-800">
                    <th className="text-left py-2 font-semibold tracking-wide">Hora</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Abordagens</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Entrou</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {(hourly as HourlyPerformance[]).map((h, i) => (
                    <tr key={i} className="border-b border-zinc-800 last:border-0">
                      <td className="py-2.5 text-zinc-200">{h.hour}h–{h.hour + 1}h</td>
                      <td className="py-2.5 text-right text-zinc-400">{h.approaches}</td>
                      <td className="py-2.5 text-right text-zinc-400">{h.converted_people}</td>
                      <td className="py-2.5 text-right text-zinc-400">{formatPercent(h.conversion_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Performance hostess */}
          {hostessPerf.length > 0 && (
            <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                Performance por Hostess
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 uppercase text-xs border-b border-zinc-800">
                    <th className="text-left py-2 font-semibold tracking-wide">Hostess</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Abordagens</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Entrou</th>
                    <th className="text-right py-2 font-semibold tracking-wide">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(hostessPerf as any[]).map((h, i) => {
                    const entrou = Math.round(h.approaches * h.group_conversion_rate / 100);
                    const lowSample = h.approaches < 10;
                    return (
                      <tr key={i} className="border-b border-zinc-800 last:border-0">
                        <td className="py-2.5 text-zinc-200 flex items-center gap-2">
                          {h.hostess_name}
                          {lowSample && (
                            <span className="text-xs text-zinc-600 font-normal">
                              ({h.approaches} abord.)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-zinc-400">{h.approaches}</td>
                        <td className="py-2.5 text-right text-zinc-400">{entrou}</td>
                        <td className="py-2.5 text-right text-zinc-400">
                          {lowSample ? (
                            <span className="text-zinc-600">{formatPercent(h.group_conversion_rate)} *</span>
                          ) : (
                            formatPercent(h.group_conversion_rate)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-zinc-600 mt-3">* Amostra insuficiente (&lt; 10 abordagens)</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
