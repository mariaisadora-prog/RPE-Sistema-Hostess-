import { toZonedTime } from 'date-fns-tz';
import type {
  PerformanceHighlights,
  TopLossReasonHighlight,
  WeekdayHighlight,
  WeekdayRejectionHighlight,
  HourHighlight,
  DateConversionHighlight,
} from '@/src/types';

export const APP_TIMEZONE = 'America/Sao_Paulo';
export const MIN_CONVERSION_SAMPLE = 10;

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export interface RawApproachRow {
  unit_id: string;
  unit_name: string;
  converted: boolean;
  loss_reason_id: string | null;
  loss_reason_name: string | null;
  created_at: string;
}

function zonedWeekday(dateStr: string, tz: string): number {
  return toZonedTime(new Date(dateStr), tz).getDay();
}

function zonedHour(dateStr: string, tz: string): number {
  return toZonedTime(new Date(dateStr), tz).getHours();
}

function zonedDate(dateStr: string, tz: string): string {
  const d = toZonedTime(new Date(dateStr), tz);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeHighlights(rows: RawApproachRow[], timezone: string): PerformanceHighlights {
  const approaches = rows.length;
  const entered = rows.filter((r) => r.converted).length;
  const notEntered = rows.filter((r) => !r.converted).length;

  // ── Top loss reason ──────────────────────────
  const reasonMap = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    if (!row.converted && row.loss_reason_id) {
      const name = row.loss_reason_name || 'Desconhecido';
      const cur = reasonMap.get(row.loss_reason_id) || { name, count: 0 };
      cur.count++;
      reasonMap.set(row.loss_reason_id, cur);
    }
  }
  const allReasons = Array.from(reasonMap.values()).sort((a, b) => b.count - a.count);
  const identified = allReasons.filter(
    (r) => r.name !== 'Não identificado' && r.name !== 'Desconhecido'
  );
  const topEntry = identified[0] ?? allReasons[0] ?? null;
  const topLossReason: TopLossReasonHighlight | null = topEntry
    ? { name: topEntry.name, count: topEntry.count }
    : null;

  // ── Weekday ──────────────────────────────────
  const wdAppr = new Array(7).fill(0);
  const wdRej = new Array(7).fill(0);
  for (const row of rows) {
    const d = zonedWeekday(row.created_at, timezone);
    wdAppr[d]++;
    if (!row.converted) wdRej[d]++;
  }

  let maxApprWD = -1, maxApprCount = 0;
  let maxRejWD = -1, maxRejCount = 0;
  for (let i = 0; i < 7; i++) {
    if (wdAppr[i] > maxApprCount) { maxApprCount = wdAppr[i]; maxApprWD = i; }
    if (wdRej[i] > maxRejCount) { maxRejCount = wdRej[i]; maxRejWD = i; }
  }

  const highestApproachWeekday: WeekdayHighlight | null =
    maxApprWD >= 0 ? { weekday: WEEKDAY_NAMES[maxApprWD], approaches: maxApprCount } : null;

  const highestRejectionWeekday: WeekdayRejectionHighlight | null =
    maxRejWD >= 0
      ? {
          weekday: WEEKDAY_NAMES[maxRejWD],
          rejections: maxRejCount,
          rejectionRate:
            wdAppr[maxRejWD] > 0
              ? Math.round((maxRejCount / wdAppr[maxRejWD]) * 1000) / 10
              : 0,
        }
      : null;

  // ── Hour (only hours with records) ───────────
  const hourMap = new Map<number, number>();
  for (const row of rows) {
    const h = zonedHour(row.created_at, timezone);
    hourMap.set(h, (hourMap.get(h) || 0) + 1);
  }

  let maxH = -1, maxHCnt = 0;
  let minH = -1, minHCnt = Infinity;
  for (const [h, cnt] of hourMap.entries()) {
    if (cnt > maxHCnt) { maxHCnt = cnt; maxH = h; }
    if (cnt < minHCnt) { minHCnt = cnt; minH = h; }
  }

  const highestApproachHour: HourHighlight | null =
    maxH >= 0 ? { hourStart: maxH, hourEnd: maxH + 1, approaches: maxHCnt } : null;
  const lowestApproachHour: HourHighlight | null =
    minH >= 0 ? { hourStart: minH, hourEnd: minH + 1, approaches: minHCnt } : null;

  // ── Date conversion (min sample) ─────────────
  const dateMap = new Map<string, { approaches: number; entered: number }>();
  for (const row of rows) {
    const dateRaw = zonedDate(row.created_at, timezone);
    const cur = dateMap.get(dateRaw) || { approaches: 0, entered: 0 };
    cur.approaches++;
    if (row.converted) cur.entered++;
    dateMap.set(dateRaw, cur);
  }

  const qualifying: DateConversionHighlight[] = Array.from(dateMap.entries())
    .filter(([, d]) => d.approaches >= MIN_CONVERSION_SAMPLE)
    .map(([dateRaw, d]) => {
      const [y, m, day] = dateRaw.split('-');
      return {
        date: `${day}/${m}/${y}`,
        dateRaw,
        approaches: d.approaches,
        entered: d.entered,
        notEntered: d.approaches - d.entered,
        conversionRate: Math.round((d.entered / d.approaches) * 1000) / 10,
      };
    })
    .sort((a, b) => b.conversionRate - a.conversionRate);

  const highestConversionDate = qualifying[0] ?? null;
  const lowestConversionDate = qualifying.length > 1 ? qualifying[qualifying.length - 1] : null;

  return {
    approaches,
    entered,
    notEntered,
    topLossReason,
    highestApproachWeekday,
    highestRejectionWeekday,
    highestApproachHour,
    lowestApproachHour,
    highestConversionDate,
    lowestConversionDate,
  };
}

export function computeLossReasonBreakdown(rows: RawApproachRow[]) {
  let total = 0;
  const reasonMap = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    if (!row.converted && row.loss_reason_id) {
      const name = row.loss_reason_name || 'Desconhecido';
      const cur = reasonMap.get(row.loss_reason_id) || { name, count: 0 };
      cur.count++;
      reasonMap.set(row.loss_reason_id, cur);
      total++;
    }
  }
  return Array.from(reasonMap.entries())
    .map(([id, d]) => ({
      loss_reason_id: id,
      loss_reason_name: d.name,
      groups: d.count,
      people: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.groups - a.groups);
}
