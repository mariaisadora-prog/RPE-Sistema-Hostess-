// ============================================================
// RPE FLOW — Analytics: Centralized Calculation Functions
// ============================================================
// These functions implement the official formulas from the spec.
// All calculations are done here to avoid duplication.

import type {
  DashboardSummary,
  HourlyPerformance,
  HostessPerformance,
  LossReasonPerformance,
  AudiencePerformance,
  CompetitorPerformance,
  InterestPerformance,
} from '@/types';

// ============================================================
// Safe division — prevents division by zero
// ============================================================
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ============================================================
// CONVERSION RATES
// ============================================================

/**
 * taxa_conversao_grupos = grupos_convertidos / total_abordagens * 100
 */
export function calculateGroupConversion(convertedGroups: number, totalGroups: number): number {
  return Math.round(safeDivide(convertedGroups, totalGroups) * 1000) / 10;
}

/**
 * taxa_conversao_pessoas = pessoas_convertidas / pessoas_abordadas * 100
 */
export function calculatePeopleConversion(convertedPeople: number, totalPeople: number): number {
  return Math.round(safeDivide(convertedPeople, totalPeople) * 1000) / 10;
}

// ============================================================
// DASHBOARD SUMMARY — build from raw aggregations
// ============================================================
export function buildDashboardSummary(data: {
  total_approaches: number;
  total_people: number;
  converted_groups: number;
  converted_people: number;
}): DashboardSummary {
  const notConvertedGroups = data.total_approaches - data.converted_groups;
  const notConvertedPeople = data.total_people - data.converted_people;

  return {
    total_approaches: data.total_approaches,
    total_people: data.total_people,
    converted_groups: data.converted_groups,
    converted_people: data.converted_people,
    not_converted_groups: notConvertedGroups,
    not_converted_people: notConvertedPeople,
    group_conversion_rate: calculateGroupConversion(data.converted_groups, data.total_approaches),
    people_conversion_rate: calculatePeopleConversion(data.converted_people, data.total_people),
  };
}

// ============================================================
// HOURLY PERFORMANCE — from raw approach data
// ============================================================
export function calculateHourlyPerformance(
  approaches: Array<{ created_at: string; group_size: number; converted: boolean }>
): HourlyPerformance[] {
  const hourMap = new Map<number, { approaches: number; people: number; converted_people: number }>();

  for (const a of approaches) {
    const hour = new Date(a.created_at).getHours();
    const current = hourMap.get(hour) || { approaches: 0, people: 0, converted_people: 0 };
    current.approaches++;
    current.people += a.group_size;
    if (a.converted) current.converted_people += a.group_size;
    hourMap.set(hour, current);
  }

  return Array.from(hourMap.entries())
    .map(([hour, data]) => ({
      hour,
      approaches: data.approaches,
      people: data.people,
      converted_people: data.converted_people,
      conversion_rate: calculatePeopleConversion(data.converted_people, data.people),
    }))
    .sort((a, b) => a.hour - b.hour);
}

// ============================================================
// HOSTESS PERFORMANCE — from raw approach data
// ============================================================
export function calculateHostessPerformanceFromRaw(
  approaches: Array<{ hostess_id: string; group_size: number; converted: boolean }>,
  hostessNames: Record<string, string>
): HostessPerformance[] {
  const hostessMap = new Map<string, { approaches: number; people: number; converted_groups: number; converted_people: number }>();

  for (const a of approaches) {
    const current = hostessMap.get(a.hostess_id) || { approaches: 0, people: 0, converted_groups: 0, converted_people: 0 };
    current.approaches++;
    current.people += a.group_size;
    if (a.converted) {
      current.converted_groups++;
      current.converted_people += a.group_size;
    }
    hostessMap.set(a.hostess_id, current);
  }

  return Array.from(hostessMap.entries())
    .map(([id, data]) => ({
      hostess_id: id,
      hostess_name: hostessNames[id] || 'Desconhecida',
      approaches: data.approaches,
      people_approached: data.people,
      people_converted: data.converted_people,
      group_conversion_rate: calculateGroupConversion(data.converted_groups, data.approaches),
      people_conversion_rate: calculatePeopleConversion(data.converted_people, data.people),
    }))
    .sort((a, b) => b.people_converted - a.people_converted);
}

// ============================================================
// LOSS REASON PERFORMANCE
// ============================================================
export function calculateLossReasons(
  approaches: Array<{ loss_reason_id: string | null; group_size: number; converted: boolean }>,
  reasonNames: Record<string, string>
): LossReasonPerformance[] {
  const notConverted = approaches.filter((a) => !a.converted && a.loss_reason_id);
  const totalGroups = notConverted.length;
  const reasonMap = new Map<string, { groups: number; people: number }>();

  for (const a of notConverted) {
    const id = a.loss_reason_id!;
    const current = reasonMap.get(id) || { groups: 0, people: 0 };
    current.groups++;
    current.people += a.group_size;
    reasonMap.set(id, current);
  }

  return Array.from(reasonMap.entries())
    .map(([id, data]) => ({
      loss_reason_id: id,
      loss_reason_name: reasonNames[id] || 'Desconhecido',
      groups: data.groups,
      people: data.people,
      percentage: Math.round(safeDivide(data.groups, totalGroups) * 1000) / 10,
    }))
    .sort((a, b) => b.groups - a.groups);
}

// ============================================================
// AUDIENCE PROFILE PERFORMANCE
// ============================================================
export function calculateAudienceProfilePerformance(
  approaches: Array<{ audience_profile_id: string | null; group_size: number; converted: boolean }>,
  profileNames: Record<string, string>
): AudiencePerformance[] {
  const totalGroups = approaches.length;
  const profileMap = new Map<string, { groups: number; people: number; converted_groups: number; converted_people: number }>();

  for (const a of approaches) {
    const id = a.audience_profile_id || 'unknown';
    const current = profileMap.get(id) || { groups: 0, people: 0, converted_groups: 0, converted_people: 0 };
    current.groups++;
    current.people += a.group_size;
    if (a.converted) {
      current.converted_groups++;
      current.converted_people += a.group_size;
    }
    profileMap.set(id, current);
  }

  return Array.from(profileMap.entries())
    .map(([id, data]) => ({
      audience_profile_id: id,
      audience_profile_name: profileNames[id] || 'Não identificado',
      groups: data.groups,
      people: data.people,
      converted_groups: data.converted_groups,
      converted_people: data.converted_people,
      group_conversion_rate: calculateGroupConversion(data.converted_groups, data.groups),
      people_conversion_rate: calculatePeopleConversion(data.converted_people, data.people),
      percentage: Math.round(safeDivide(data.groups, totalGroups) * 1000) / 10,
    }))
    .sort((a, b) => b.groups - a.groups);
}

// ============================================================
// COMPETITOR PERFORMANCE
// ============================================================
export function calculateCompetitorPerformance(
  approaches: Array<{ competitor_id: string | null; group_size: number; converted: boolean }>,
  competitorNames: Record<string, string>
): CompetitorPerformance[] {
  const lost = approaches.filter((a) => !a.converted && a.competitor_id);
  const totalLostGroups = lost.length;
  const compMap = new Map<string, { groups: number; people: number }>();

  for (const a of lost) {
    const id = a.competitor_id!;
    const current = compMap.get(id) || { groups: 0, people: 0 };
    current.groups++;
    current.people += a.group_size;
    compMap.set(id, current);
  }

  return Array.from(compMap.entries())
    .map(([id, data]) => ({
      competitor_id: id,
      competitor_name: competitorNames[id] || 'Desconhecido',
      groups: data.groups,
      people: data.people,
      percentage: Math.round(safeDivide(data.groups, totalLostGroups) * 1000) / 10,
    }))
    .sort((a, b) => b.groups - a.groups);
}

// ============================================================
// INTEREST PERFORMANCE
// ============================================================
export function calculateInterestPerformance(
  approaches: Array<{ interest_id: string | null; group_size: number; converted: boolean }>,
  interestNames: Record<string, string>
): InterestPerformance[] {
  const converted = approaches.filter((a) => a.converted && a.interest_id);
  const totalGroups = converted.length;
  const interestMap = new Map<string, { groups: number; people: number }>();

  for (const a of converted) {
    const id = a.interest_id!;
    const current = interestMap.get(id) || { groups: 0, people: 0 };
    current.groups++;
    current.people += a.group_size;
    interestMap.set(id, current);
  }

  return Array.from(interestMap.entries())
    .map(([id, data]) => ({
      interest_id: id,
      interest_name: interestNames[id] || 'Desconhecido',
      groups: data.groups,
      people: data.people,
      percentage: Math.round(safeDivide(data.groups, totalGroups) * 1000) / 10,
    }))
    .sort((a, b) => b.groups - a.groups);
}

// ============================================================
// INSIGHTS — Data-driven text generation (no AI)
// ============================================================
export function generateInsights(summary: DashboardSummary, hourly: HourlyPerformance[], lossReasons: LossReasonPerformance[]): string[] {
  const insights: string[] = [];

  if (summary.total_approaches === 0) {
    return ['Nenhuma abordagem registrada para este período.'];
  }

  // Best hourly performance
  if (hourly.length > 0) {
    const bestHour = hourly.reduce((best, h) => (h.conversion_rate > best.conversion_rate ? h : best));
    if (bestHour.approaches >= 3) {
      insights.push(
        `A maior conversão foi observada entre ${bestHour.hour}h e ${bestHour.hour + 1}h, com ${formatRate(bestHour.conversion_rate)} de conversão.`
      );
    }
  }

  // Top loss reason
  if (lossReasons.length > 0) {
    const topReason = lossReasons[0];
    insights.push(
      `"${topReason.loss_reason_name}" representou ${formatRate(topReason.percentage)} das recusas registradas.`
    );
  }

  // Conversion summary
  if (summary.not_converted_people > 0) {
    insights.push(
      `${summary.not_converted_people} pessoas não convertidas foram registradas no período.`
    );
  }

  // Group vs people conversion difference
  const diff = Math.abs(summary.group_conversion_rate - summary.people_conversion_rate);
  if (diff > 5) {
    const higher = summary.group_conversion_rate > summary.people_conversion_rate ? 'grupos' : 'pessoas';
    insights.push(
      `A conversão de ${higher} apresentou ${formatRate(diff)} a mais que a métrica alternativa.`
    );
  }

  return insights;
}

function formatRate(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}
