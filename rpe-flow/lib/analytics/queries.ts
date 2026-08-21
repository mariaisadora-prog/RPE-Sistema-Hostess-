// ============================================================
// RPE FLOW — Analytics: Supabase Queries (server-side)
// ============================================================

import { createClient } from '@/lib/supabase/server';
import type { DashboardFilters } from '@/types';
import type { RawApproachRow } from './highlights';

interface QueryFilters {
  campaignId?: string;
  unitId?: string;
  hostessId?: string;
  audienceProfileId?: string;
  startDate: string;
  endDate: string;
}

function applyFilters(query: ReturnType<ReturnType<Awaited<ReturnType<typeof createClient>>['from']>['select']>, filters: QueryFilters) {
  let q = query.is('deleted_at', null);
  
  if (filters.campaignId) q = q.eq('campaign_id', filters.campaignId);
  if (filters.unitId) q = q.eq('unit_id', filters.unitId);
  if (filters.hostessId) q = q.eq('hostess_id', filters.hostessId);
  if (filters.audienceProfileId) q = q.eq('audience_profile_id', filters.audienceProfileId);
  if (filters.startDate) q = q.gte('created_at', filters.startDate);
  if (filters.endDate) q = q.lte('created_at', filters.endDate);
  
  return q;
}

/**
 * Get dashboard summary using the database function
 */
export async function getDashboardSummary(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_campaign_id: filters.campaignId || null,
    p_unit_id: filters.unitId || null,
    p_hostess_id: filters.hostessId || null,
    p_audience_profile_id: filters.audienceProfileId || null,
    p_start_date: filters.startDate || null,
    p_end_date: filters.endDate || null,
  });

  if (error) throw error;
  return data?.[0] || {
    total_approaches: 0,
    total_people: 0,
    converted_groups: 0,
    converted_people: 0,
    not_converted_groups: 0,
    not_converted_people: 0,
    group_conversion_rate: 0,
    people_conversion_rate: 0,
  };
}

/**
 * Get hourly performance using the database function
 */
export async function getHourlyPerformance(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_hourly_performance', {
    p_campaign_id: filters.campaignId || null,
    p_unit_id: filters.unitId || null,
    p_hostess_id: filters.hostessId || null,
    p_start_date: filters.startDate || null,
    p_end_date: filters.endDate || null,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get hostess performance using the database function
 */
export async function getHostessPerformance(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_hostess_performance', {
    p_campaign_id: filters.campaignId || null,
    p_unit_id: filters.unitId || null,
    p_start_date: filters.startDate || null,
    p_end_date: filters.endDate || null,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get loss reason performance
 */
export async function getLossReasonPerformance(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const query = supabase
    .from('approaches')
    .select(`
      loss_reason_id,
      group_size,
      loss_reasons!inner(name)
    `)
    .eq('converted', false)
    .not('loss_reason_id', 'is', null)
    .is('deleted_at', null);

  if (filters.campaignId) query.eq('campaign_id', filters.campaignId);
  if (filters.unitId) query.eq('unit_id', filters.unitId);
  if (filters.hostessId) query.eq('hostess_id', filters.hostessId);
  if (filters.startDate) query.gte('created_at', filters.startDate);
  if (filters.endDate) query.lte('created_at', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate in memory
  const reasonMap = new Map<string, { name: string; groups: number; people: number }>();
  let totalGroups = 0;

  for (const row of data || []) {
    const id = row.loss_reason_id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (row as any).loss_reasons?.name || 'Desconhecido';
    const current = reasonMap.get(id) || { name, groups: 0, people: 0 };
    current.groups++;
    current.people += row.group_size;
    reasonMap.set(id, current);
    totalGroups++;
  }

  return Array.from(reasonMap.entries())
    .map(([id, d]) => ({
      loss_reason_id: id,
      loss_reason_name: d.name,
      groups: d.groups,
      people: d.people,
      percentage: totalGroups > 0 ? Math.round((d.groups / totalGroups) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.groups - a.groups);
}

/**
 * Get audience profile performance
 */
export async function getAudiencePerformance(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const query = supabase
    .from('approaches')
    .select(`
      audience_profile_id,
      group_size,
      converted,
      audience_profiles(name)
    `)
    .is('deleted_at', null);

  if (filters.campaignId) query.eq('campaign_id', filters.campaignId);
  if (filters.unitId) query.eq('unit_id', filters.unitId);
  if (filters.hostessId) query.eq('hostess_id', filters.hostessId);
  if (filters.startDate) query.gte('created_at', filters.startDate);
  if (filters.endDate) query.lte('created_at', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const profileMap = new Map<string, { name: string; groups: number; people: number; cg: number; cp: number }>();
  let totalGroups = 0;

  for (const row of data || []) {
    const id = row.audience_profile_id || 'unknown';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (row as any).audience_profiles?.name || 'Não identificado';
    const current = profileMap.get(id) || { name, groups: 0, people: 0, cg: 0, cp: 0 };
    current.groups++;
    current.people += row.group_size;
    if (row.converted) {
      current.cg++;
      current.cp += row.group_size;
    }
    profileMap.set(id, current);
    totalGroups++;
  }

  return Array.from(profileMap.entries())
    .map(([id, d]) => ({
      audience_profile_id: id,
      audience_profile_name: d.name,
      groups: d.groups,
      people: d.people,
      converted_groups: d.cg,
      converted_people: d.cp,
      group_conversion_rate: d.groups > 0 ? Math.round((d.cg / d.groups) * 1000) / 10 : 0,
      people_conversion_rate: d.people > 0 ? Math.round((d.cp / d.people) * 1000) / 10 : 0,
      percentage: totalGroups > 0 ? Math.round((d.groups / totalGroups) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.groups - a.groups);
}

/**
 * Get competitor performance (destination of lost customers)
 */
export async function getCompetitorPerformance(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const query = supabase
    .from('approaches')
    .select(`
      competitor_id,
      group_size,
      competitors(name)
    `)
    .eq('converted', false)
    .not('competitor_id', 'is', null)
    .is('deleted_at', null);

  if (filters.campaignId) query.eq('campaign_id', filters.campaignId);
  if (filters.unitId) query.eq('unit_id', filters.unitId);
  if (filters.startDate) query.gte('created_at', filters.startDate);
  if (filters.endDate) query.lte('created_at', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const compMap = new Map<string, { name: string; groups: number; people: number }>();
  let totalGroups = 0;

  for (const row of data || []) {
    const id = row.competitor_id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (row as any).competitors?.name || 'Desconhecido';
    const current = compMap.get(id) || { name, groups: 0, people: 0 };
    current.groups++;
    current.people += row.group_size;
    compMap.set(id, current);
    totalGroups++;
  }

  return Array.from(compMap.entries())
    .map(([id, d]) => ({
      competitor_id: id,
      competitor_name: d.name,
      groups: d.groups,
      people: d.people,
      percentage: totalGroups > 0 ? Math.round((d.groups / totalGroups) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.groups - a.groups);
}

/**
 * Get interest performance (for converted groups)
 */
export async function getInterestPerformance(filters: DashboardFilters) {
  const supabase = await createClient();
  
  const query = supabase
    .from('approaches')
    .select(`
      interest_id,
      group_size,
      campaign_interests(name)
    `)
    .eq('converted', true)
    .not('interest_id', 'is', null)
    .is('deleted_at', null);

  if (filters.campaignId) query.eq('campaign_id', filters.campaignId);
  if (filters.unitId) query.eq('unit_id', filters.unitId);
  if (filters.startDate) query.gte('created_at', filters.startDate);
  if (filters.endDate) query.lte('created_at', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const intMap = new Map<string, { name: string; groups: number; people: number }>();
  let totalGroups = 0;

  for (const row of data || []) {
    const id = row.interest_id!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (row as any).campaign_interests?.name || 'Desconhecido';
    const current = intMap.get(id) || { name, groups: 0, people: 0 };
    current.groups++;
    current.people += row.group_size;
    intMap.set(id, current);
    totalGroups++;
  }

  return Array.from(intMap.entries())
    .map(([id, d]) => ({
      interest_id: id,
      interest_name: d.name,
      groups: d.groups,
      people: d.people,
      percentage: totalGroups > 0 ? Math.round((d.groups / totalGroups) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.groups - a.groups);
}

/**
 * Get per-unit performance in a single query, grouped in memory.
 * Respects all filters; when unitId is set, returns only that unit.
 */
export async function getUnitPerformance(filters: DashboardFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('approaches')
    .select(`
      unit_id,
      group_size,
      converted,
      loss_reason_id,
      units(name),
      loss_reasons(name)
    `)
    .is('deleted_at', null);

  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId) as typeof query;
  if (filters.unitId) query = query.eq('unit_id', filters.unitId) as typeof query;
  if (filters.hostessId) query = query.eq('hostess_id', filters.hostessId) as typeof query;
  if (filters.startDate) query = query.gte('created_at', filters.startDate) as typeof query;
  if (filters.endDate) query = query.lte('created_at', filters.endDate) as typeof query;

  const { data, error } = await query;
  if (error) throw error;

  const unitMap = new Map<string, {
    unitName: string;
    approaches: number;
    converted: number;
    notConverted: number;
    lossReasonCounts: Map<string, { name: string; count: number }>;
  }>();

  for (const row of data || []) {
    const uid = row.unit_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unitName = (row as any).units?.name || 'Desconhecida';

    if (!unitMap.has(uid)) {
      unitMap.set(uid, { unitName, approaches: 0, converted: 0, notConverted: 0, lossReasonCounts: new Map() });
    }

    const u = unitMap.get(uid)!;
    u.approaches++;

    if (row.converted) {
      u.converted++;
    } else {
      u.notConverted++;
      if (row.loss_reason_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reasonName = (row as any).loss_reasons?.name || 'Desconhecido';
        const cur = u.lossReasonCounts.get(row.loss_reason_id) || { name: reasonName, count: 0 };
        cur.count++;
        u.lossReasonCounts.set(row.loss_reason_id, cur);
      }
    }
  }

  return Array.from(unitMap.entries()).map(([unitId, u]) => {
    // Prefer identified reasons over "Não identificado" / "Desconhecido"
    const identified = Array.from(u.lossReasonCounts.values())
      .filter((r) => r.name !== 'Não identificado' && r.name !== 'Desconhecido')
      .sort((a, b) => b.count - a.count);

    const topEntry = identified[0] ?? Array.from(u.lossReasonCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null;

    return {
      unitId,
      unitName: u.unitName,
      approaches: u.approaches,
      converted: u.converted,
      notConverted: u.notConverted,
      topLossReason: topEntry?.name ?? null,
      topLossReasonCount: topEntry?.count ?? 0,
    };
  }).sort((a, b) => b.approaches - a.approaches);
}

/**
 * Fetch raw approach rows for in-memory highlights computation.
 * Returns one row per approach with unit, loss reason, and created_at.
 */
export async function getPerformanceData(filters: DashboardFilters): Promise<RawApproachRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from('approaches')
    .select(`
      unit_id,
      converted,
      loss_reason_id,
      created_at,
      units(name),
      loss_reasons(name)
    `)
    .is('deleted_at', null);

  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId) as typeof query;
  if (filters.unitId) query = query.eq('unit_id', filters.unitId) as typeof query;
  if (filters.hostessId) query = query.eq('hostess_id', filters.hostessId) as typeof query;
  if (filters.startDate) query = query.gte('created_at', filters.startDate) as typeof query;
  if (filters.endDate) query = query.lte('created_at', filters.endDate) as typeof query;

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    unit_id: row.unit_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unit_name: (row as any).units?.name || 'Desconhecida',
    converted: row.converted,
    loss_reason_id: row.loss_reason_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loss_reason_name: (row as any).loss_reasons?.name || null,
    created_at: row.created_at,
  }));
}

/**
 * Get approaches for table/list view with pagination
 */
export async function getApproaches(
  filters: DashboardFilters & { page?: number; pageSize?: number }
) {
  const supabase = await createClient();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('approaches')
    .select(`
      *,
      campaigns(name),
      units(name),
      profiles!approaches_hostess_id_fkey(name),
      audience_profiles(name),
      campaign_interests(name),
      loss_reasons(name),
      competitors(name)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);
  if (filters.unitId) query = query.eq('unit_id', filters.unitId);
  if (filters.hostessId) query = query.eq('hostess_id', filters.hostessId);
  if (filters.audienceProfileId) query = query.eq('audience_profile_id', filters.audienceProfileId);
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
