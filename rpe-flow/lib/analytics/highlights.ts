import { toZonedTime } from 'date-fns-tz';
import type {
  PerformanceHighlights,
  TopLossReasonHighlight,
  WeekdayHighlight,
  WeekdayRejectionHighlight,
  WeekdayPeriodHighlight,
  WeekdayPeriodRejectionHighlight,
  MissingItemHighlight,
  HourHighlight,
  DateConversionHighlight,
} from '@/src/types';

export const APP_TIMEZONE = 'America/Sao_Paulo';
export const MIN_CONVERSION_SAMPLE = 10;

// Operational hours (spec section 48-49)
const LUNCH_START = 11;
const LUNCH_END = 17;   // exclusive
const DINNER_START = 17;
const DINNER_END = 23;  // exclusive

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export interface RawApproachRow {
  unit_id: string;
  unit_name: string;
  group_size: number;
  people_entered: number;
  people_rejected: number;
  outcome: string;
  converted: boolean;
  loss_reason_id: string | null;
  loss_reason_name: string | null;
  created_at: string;
  specific_demand: boolean | null;
  requested_item_id: string | null;
  requested_item_name: string | null;
  exists_on_menu: boolean | null;
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

function getPeriod(hour: number): 'Almoço' | 'Jantar' | null {
  if (hour >= LUNCH_START && hour < LUNCH_END) return 'Almoço';
  if (hour >= DINNER_START && hour < DINNER_END) return 'Jantar';
  return null;
}

export function computeHighlights(rows: RawApproachRow[], timezone: string): PerformanceHighlights {
  // ── Core people totals (spec rule: analyze PEOPLE, not groups) ──────
  const approaches = rows.reduce((s, r) => s + r.group_size, 0);
  const entered = rows.reduce((s, r) => s + r.people_entered, 0);
  const notEntered = rows.reduce((s, r) => s + r.people_rejected, 0);

  // ── Top loss reason — by PEOPLE (spec §46-47) ────────────────────────
  const reasonMap = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    if (row.people_rejected > 0 && row.loss_reason_id) {
      const name = row.loss_reason_name || 'Desconhecido';
      const cur = reasonMap.get(row.loss_reason_id) || { name, count: 0 };
      cur.count += row.people_rejected;
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

  // ── Weekday + period analytics (spec §51-54) ──────────────────────────
  // Key: `${weekdayIndex}:${period}` → { approaches, entered, rejected }
  const periodMap = new Map<string, { weekday: string; period: 'Almoço' | 'Jantar'; approaches: number; entered: number; rejected: number }>();
  for (const row of rows) {
    const h = zonedHour(row.created_at, timezone);
    const period = getPeriod(h);
    if (!period) continue;
    const wd = zonedWeekday(row.created_at, timezone);
    const key = `${wd}:${period}`;
    const cur = periodMap.get(key) || { weekday: WEEKDAY_NAMES[wd], period, approaches: 0, entered: 0, rejected: 0 };
    cur.approaches += row.group_size;
    cur.entered += row.people_entered;
    cur.rejected += row.people_rejected;
    periodMap.set(key, cur);
  }

  let bestConversionPeriod: WeekdayPeriodHighlight | null = null;
  let highestRejectionPeriod: WeekdayPeriodRejectionHighlight | null = null;

  for (const d of periodMap.values()) {
    if (!bestConversionPeriod || d.entered > bestConversionPeriod.entered) {
      bestConversionPeriod = {
        weekday: d.weekday,
        period: d.period,
        approaches: d.approaches,
        entered: d.entered,
        conversionRate: d.approaches > 0 ? Math.round((d.entered / d.approaches) * 1000) / 10 : 0,
      };
    }
    if (!highestRejectionPeriod || d.rejected > highestRejectionPeriod.rejected) {
      highestRejectionPeriod = {
        weekday: d.weekday,
        period: d.period,
        approaches: d.approaches,
        rejected: d.rejected,
        rejectionRate: d.approaches > 0 ? Math.round((d.rejected / d.approaches) * 1000) / 10 : 0,
      };
    }
  }

  // ── Top missing item (spec §55) ───────────────────────────────────────
  // Filter: specific_demand=true AND exists_on_menu=false
  const missingMap = new Map<string, { name: string; people: number }>();
  for (const row of rows) {
    if (row.specific_demand && row.exists_on_menu === false && row.requested_item_id) {
      const name = row.requested_item_name || 'Desconhecido';
      const cur = missingMap.get(row.requested_item_id) || { name, people: 0 };
      cur.people += row.group_size;
      missingMap.set(row.requested_item_id, cur);
    }
  }
  let topMissingItem: MissingItemHighlight | null = null;
  for (const d of missingMap.values()) {
    if (!topMissingItem || d.people > topMissingItem.people) {
      topMissingItem = { name: d.name, people: d.people };
    }
  }

  // ── Weekday by people (spec §50) ─────────────────────────────────────
  const wdAppr = new Array(7).fill(0);
  const wdRej = new Array(7).fill(0);
  for (const row of rows) {
    const d = zonedWeekday(row.created_at, timezone);
    wdAppr[d] += row.group_size;
    wdRej[d] += row.people_rejected;
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

  // ── Hour by people ───────────────────────────────────────────────────
  const hourMap = new Map<number, number>();
  for (const row of rows) {
    const h = zonedHour(row.created_at, timezone);
    hourMap.set(h, (hourMap.get(h) || 0) + row.group_size);
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

  // ── Date conversion by people (spec §63 — no simple rate average) ────
  const dateMap = new Map<string, { approaches: number; entered: number }>();
  for (const row of rows) {
    const dateRaw = zonedDate(row.created_at, timezone);
    const cur = dateMap.get(dateRaw) || { approaches: 0, entered: 0 };
    cur.approaches += row.group_size;
    cur.entered += row.people_entered;
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
    bestConversionPeriod,
    highestRejectionPeriod,
    topMissingItem,
    highestApproachWeekday,
    highestRejectionWeekday,
    highestApproachHour,
    lowestApproachHour,
    highestConversionDate,
    lowestConversionDate,
  };
}

export function computeLossReasonBreakdown(rows: RawApproachRow[]) {
  let totalPeople = 0;
  const reasonMap = new Map<string, { name: string; groups: number; people: number }>();
  for (const row of rows) {
    if (row.people_rejected > 0 && row.loss_reason_id) {
      const name = row.loss_reason_name || 'Desconhecido';
      const cur = reasonMap.get(row.loss_reason_id) || { name, groups: 0, people: 0 };
      cur.groups++;
      cur.people += row.people_rejected;
      reasonMap.set(row.loss_reason_id, cur);
      totalPeople += row.people_rejected;
    }
  }
  return Array.from(reasonMap.entries())
    .map(([id, d]) => ({
      loss_reason_id: id,
      loss_reason_name: d.name,
      groups: d.groups,
      people: d.people,
      percentage: totalPeople > 0 ? Math.round((d.people / totalPeople) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.people - a.people);
}
