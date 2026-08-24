import { formatNumber, formatPercent } from '@/lib/utils';
import type { PerformanceHighlights } from '@/src/types';

interface Props {
  data: PerformanceHighlights;
  enteredYesterday?: number;
}

function vsOntemText(current: number, previous: number | undefined): string | undefined {
  if (previous === undefined || previous === 0) return undefined;
  const pct = ((current - previous) / previous) * 100;
  const arrow = pct >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(pct).toFixed(1).replace('.', ',')}% vs ontem`;
}

export default function PerformanceOverview({ data, enteredYesterday }: Props) {
  const rejectionRate = data.approaches > 0
    ? (data.notEntered / data.approaches) * 100
    : 0;
  const conversionRate = data.approaches > 0
    ? (data.entered / data.approaches) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Abordagens"
          value={formatNumber(data.approaches)}
          secondary="pessoas abordadas"
        />
        <KpiCard
          label="Conversões"
          value={formatNumber(data.entered)}
          secondary={
            data.approaches > 0
              ? vsOntemText(data.entered, enteredYesterday) ??
                `${formatPercent(conversionRate)} · ${formatNumber(data.entered)} de ${formatNumber(data.approaches)}`
              : undefined
          }
          accent="emerald"
        />
        <KpiCard
          label="Rejeições"
          value={formatPercent(rejectionRate)}
          secondary={`${formatNumber(data.notEntered)} de ${formatNumber(data.approaches)} pessoas`}
        />
        <TopReasonKpi
          reason={data.topLossReason?.name ?? null}
          count={data.topLossReason?.count ?? 0}
          total={data.notEntered}
        />
      </div>

      {/* Row 2: Period KPIs + Missing item */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PeriodKpi
          label="Mais conversões"
          highlight={data.bestConversionPeriod}
          type="conversion"
        />
        <PeriodKpi
          label="Mais rejeições"
          highlight={data.highestRejectionPeriod}
          type="rejection"
        />
        <MissingItemKpi item={data.topMissingItem} />
      </div>

      {/* Row 3-4: Operational insights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InsightCard
          label="Maior abordagem por dia"
          primary={data.highestApproachWeekday?.weekday ?? '—'}
          secondary={
            data.highestApproachWeekday
              ? `${formatNumber(data.highestApproachWeekday.approaches)} pessoas`
              : undefined
          }
        />
        <InsightCard
          label="Maior rejeição por dia"
          primary={data.highestRejectionWeekday?.weekday ?? '—'}
          secondary={
            data.highestRejectionWeekday
              ? `${formatNumber(data.highestRejectionWeekday.rejections)} · ${formatPercent(data.highestRejectionWeekday.rejectionRate)} rejeição`
              : undefined
          }
        />
        <InsightCard
          label="Horário com mais abordagens"
          primary={
            data.highestApproachHour
              ? `${data.highestApproachHour.hourStart}h–${data.highestApproachHour.hourEnd}h`
              : '—'
          }
          secondary={
            data.highestApproachHour
              ? `${formatNumber(data.highestApproachHour.approaches)} pessoas`
              : undefined
          }
        />
        <InsightCard
          label="Horário com menos abordagens"
          primary={
            data.lowestApproachHour
              ? `${data.lowestApproachHour.hourStart}h–${data.lowestApproachHour.hourEnd}h`
              : '—'
          }
          secondary={
            data.lowestApproachHour
              ? `${formatNumber(data.lowestApproachHour.approaches)} pessoas`
              : undefined
          }
        />
        <InsightCard
          label="Data com maior conversão"
          primary={data.highestConversionDate?.date ?? '—'}
          secondary={
            data.highestConversionDate
              ? `${formatPercent(data.highestConversionDate.conversionRate)} · ${formatNumber(data.highestConversionDate.entered)} de ${formatNumber(data.highestConversionDate.approaches)}`
              : undefined
          }
          note={!data.highestConversionDate ? 'Mín. 10 abordagens por data' : undefined}
        />
        <InsightCard
          label="Data com menor conversão"
          primary={data.lowestConversionDate?.date ?? '—'}
          secondary={
            data.lowestConversionDate
              ? `${formatPercent(data.lowestConversionDate.conversionRate)} · ${formatNumber(data.lowestConversionDate.entered)} de ${formatNumber(data.lowestConversionDate.approaches)}`
              : undefined
          }
          note={!data.lowestConversionDate ? 'Dados insuficientes' : undefined}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  secondary,
  accent,
}: {
  label: string;
  value: string;
  secondary?: string;
  accent?: 'emerald';
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent === 'emerald' ? 'text-emerald-400' : 'text-zinc-50'}`}>
        {value}
      </p>
      {secondary && <p className="text-xs text-zinc-500 mt-1">{secondary}</p>}
    </div>
  );
}

function TopReasonKpi({
  reason,
  count,
  total,
}: {
  reason: string | null;
  count: number;
  total: number;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <p className="text-sm text-zinc-400">Principal motivo de rejeição</p>
      {reason ? (
        <>
          <p className="text-xl font-bold text-zinc-50 mt-1 leading-tight">{reason}</p>
          <p className="text-xs text-zinc-500 mt-1">{formatNumber(count)} de {formatNumber(total)} rejeições</p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold text-zinc-600 mt-1">—</p>
          <p className="text-xs text-zinc-500 mt-1">
            {total === 0 ? 'Nenhuma rejeição' : 'Motivo não identificado'}
          </p>
        </>
      )}
    </div>
  );
}

function PeriodKpi({
  label,
  highlight,
  type,
}: {
  label: string;
  highlight: { weekday: string; period: string; approaches: number; entered?: number; rejected?: number; conversionRate?: number; rejectionRate?: number } | null;
  type: 'conversion' | 'rejection';
}) {
  const isEmpty = !highlight || (type === 'conversion' ? (highlight.entered ?? 0) === 0 : (highlight.rejected ?? 0) === 0);
  const value = type === 'conversion' ? (highlight?.entered ?? 0) : (highlight?.rejected ?? 0);
  const rate = type === 'conversion' ? (highlight?.conversionRate ?? 0) : (highlight?.rejectionRate ?? 0);
  const accent = type === 'conversion' ? 'text-emerald-400' : 'text-zinc-300';

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">{label}</p>
      {isEmpty ? (
        <>
          <p className="text-lg font-bold text-zinc-600">—</p>
          <p className="text-xs text-zinc-600 mt-1">Sem dados suficientes</p>
        </>
      ) : (
        <>
          <p className="text-base font-bold text-zinc-200 leading-tight">
            {highlight!.weekday} · {highlight!.period}
          </p>
          <p className={`text-2xl font-bold mt-1 ${accent}`}>
            {formatNumber(value)} {type === 'conversion' ? 'conversões' : 'rejeições'}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {formatPercent(rate)} · {formatNumber(value)} de {formatNumber(highlight!.approaches)}
          </p>
        </>
      )}
    </div>
  );
}

function MissingItemKpi({
  item,
}: {
  item: { name: string; people: number } | null;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
        Item fora do cardápio mais procurado
      </p>
      {item ? (
        <>
          <p className="text-lg font-bold text-zinc-50 leading-tight">{item.name}</p>
          <p className="text-xs text-zinc-500 mt-1">{formatNumber(item.people)} pessoas procuraram</p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-zinc-600">—</p>
          <p className="text-xs text-zinc-600 mt-1">Nenhuma demanda identificada</p>
        </>
      )}
    </div>
  );
}

function InsightCard({
  label,
  primary,
  secondary,
  note,
}: {
  label: string;
  primary: string;
  secondary?: string;
  note?: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-lg font-bold text-zinc-50 leading-tight">{primary}</p>
      {secondary && <p className="text-xs text-zinc-400 mt-1">{secondary}</p>}
      {!secondary && note && <p className="text-xs text-zinc-500 mt-1 italic">{note}</p>}
    </div>
  );
}
