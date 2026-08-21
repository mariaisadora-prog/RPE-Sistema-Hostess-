import { formatNumber, formatPercent } from '@/lib/utils';
import type { PerformanceHighlights } from '@/src/types';

interface Props {
  data: PerformanceHighlights;
}

export default function PerformanceOverview({ data }: Props) {
  return (
    <div className="space-y-3">
      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Abordagens" value={formatNumber(data.approaches)} />
        <KpiCard label="Entrou" value={formatNumber(data.entered)} />
        <KpiCard label="Não entrou" value={formatNumber(data.notEntered)} />
        <TopReasonKpi
          reason={data.topLossReason?.name ?? null}
          count={data.topLossReason?.count ?? 0}
          total={data.notEntered}
        />
      </div>

      {/* Rows 2–3: Operational indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InsightCard
          label="Maior abordagem por dia"
          primary={data.highestApproachWeekday?.weekday ?? '—'}
          secondary={
            data.highestApproachWeekday
              ? `${formatNumber(data.highestApproachWeekday.approaches)} abordagens`
              : undefined
          }
        />
        <InsightCard
          label="Maior rejeição por dia"
          primary={data.highestRejectionWeekday?.weekday ?? '—'}
          secondary={
            data.highestRejectionWeekday
              ? `${formatNumber(data.highestRejectionWeekday.rejections)} · ${formatPercent(data.highestRejectionWeekday.rejectionRate)} de rejeição`
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
              ? `${formatNumber(data.highestApproachHour.approaches)} abordagens`
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
              ? `${formatNumber(data.lowestApproachHour.approaches)} abordagens`
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="text-3xl font-bold text-zinc-50 mt-1">{value}</p>
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
          <p className="text-xs text-zinc-500 mt-1">
            {count} de {total} rejeições
          </p>
        </>
      ) : (
        <p className="text-3xl font-bold text-zinc-600 mt-1">—</p>
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
