import { formatNumber } from '@/lib/utils';

interface UnitPerformance {
  unitId: string;
  unitName: string;
  approaches: number;
  converted: number;
  notConverted: number;
  topLossReason: string | null;
  topLossReasonCount: number;
}

export default function UnitPerformanceCard({ unit }: { unit: UnitPerformance }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 flex flex-col gap-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{unit.unitName}</p>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Abordagens" value={formatNumber(unit.approaches)} />
        <Metric label="Entrou" value={formatNumber(unit.converted)} />
        <Metric label="Não entrou" value={formatNumber(unit.notConverted)} />
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
          Principal motivo de rejeição
        </p>
        {unit.topLossReason ? (
          <>
            <p className="font-semibold text-zinc-900">{unit.topLossReason}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{unit.topLossReasonCount} ocorrências</p>
          </>
        ) : (
          <p className="text-zinc-400">—</p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-xl font-bold text-zinc-800">{value}</p>
    </div>
  );
}
