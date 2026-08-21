'use server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';

export interface ParsedRow {
  rowIndex: number;
  timestamp?: string;
  unitName?: string;
  hostessName?: string;
  groupSize?: number;
  profileName?: string;
  converted?: boolean;
  interestName?: string;
  lossReasonName?: string;
  competitorName?: string;
  notes?: string;
  valid: boolean;
  errors: string[];
}

function parseBoolean(val: string): boolean | undefined {
  const v = val.trim().toLowerCase();
  if (['sim', 'yes', 's', '1', 'true'].includes(v)) return true;
  if (['não', 'nao', 'no', 'n', '0', 'false'].includes(v)) return false;
  return undefined;
}

function parseTimestamp(val: string): string | undefined {
  if (!val) return undefined;
  // Try ISO or Brazilian formats
  const iso = new Date(val);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  // Brazilian: DD/MM/YYYY HH:MM
  const match = val.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, d, m, y, h, min] = match;
    const date = new Date(`${y}-${m}-${d}T${h}:${min}:00-03:00`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

export async function parseCSVAction(csvText: string): Promise<ParsedRow[]> {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const colIndex = (names: string[]) => {
    for (const n of names) {
      const idx = header.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const cols = {
    timestamp: colIndex(['timestamp', 'data', 'data/hora', 'horário']),
    unit: colIndex(['casa', 'unidade', 'unit']),
    hostess: colIndex(['hostess', 'nome']),
    group: colIndex(['grupo', 'pessoas', 'group', 'tamanho', 'group_size']),
    profile: colIndex(['perfil', 'profile']),
    converted: colIndex(['converteu', 'entrou', 'converted']),
    interest: colIndex(['interesse', 'interest']),
    reason: colIndex(['motivo', 'loss_reason', 'reason']),
    competitor: colIndex(['concorrente', 'competitor']),
    notes: colIndex(['observacao', 'observação', 'notas', 'notes']),
  };

  return lines.slice(1).filter((l) => l.trim()).map((line, idx) => {
    const cols_values = line.split(/[,;]/).map((v) => v.trim().replace(/^"|"$/g, ''));
    const get = (i: number) => (i >= 0 ? cols_values[i] ?? '' : '');

    const errors: string[] = [];
    const groupSizeRaw = parseInt(get(cols.group), 10);
    const groupSize = isNaN(groupSizeRaw) ? undefined : groupSizeRaw;
    if (!groupSize || groupSize < 1 || groupSize > 50) {
      errors.push('Tamanho do grupo inválido (1–50)');
    }
    const converted = parseBoolean(get(cols.converted));
    if (converted === undefined) errors.push('Campo "converteu" inválido');

    return {
      rowIndex: idx + 2,
      timestamp: parseTimestamp(get(cols.timestamp)),
      unitName: get(cols.unit) || undefined,
      hostessName: get(cols.hostess) || undefined,
      groupSize,
      profileName: get(cols.profile) || undefined,
      converted,
      interestName: get(cols.interest) || undefined,
      lossReasonName: get(cols.reason) || undefined,
      competitorName: get(cols.competitor) || undefined,
      notes: get(cols.notes) || undefined,
      valid: errors.length === 0,
      errors,
    };
  });
}

export async function importRowsAction(rows: ParsedRow[], campaignId: string) {
  const profile = await requireRole(['admin']);
  const supabase = await createClient();

  const validRows = rows.filter((r) => r.valid);
  if (validRows.length === 0) return { imported: 0, errors: 0 };

  // Load campaign data to resolve names → ids
  const [
    { data: units },
    { data: profiles },
    { data: audienceProfiles },
    { data: interests },
    { data: lossReasons },
    { data: competitors },
  ] = await Promise.all([
    supabase.from('units').select('id, name').eq('active', true),
    supabase.from('profiles').select('id, name').eq('active', true),
    supabase.from('audience_profiles').select('id, name').eq('campaign_id', campaignId).eq('active', true),
    supabase.from('campaign_interests').select('id, name').eq('campaign_id', campaignId).eq('active', true),
    supabase.from('loss_reasons').select('id, name').eq('campaign_id', campaignId).eq('active', true),
    supabase.from('competitors').select('id, name').eq('campaign_id', campaignId).eq('active', true),
  ]);

  const findById = <T extends { id: string; name: string }>(list: T[] | null, name?: string) => {
    if (!name || !list) return null;
    const lower = name.toLowerCase();
    return list.find((item) => item.name.toLowerCase() === lower)?.id ?? null;
  };

  let imported = 0;
  let errors = 0;

  for (const row of validRows) {
    if (!row.valid || row.converted === undefined || !row.groupSize) continue;

    const unitId = findById(units ?? [], row.unitName);
    const hostessId = findById(profiles ?? [], row.hostessName);

    if (!unitId || !hostessId) {
      errors++;
      continue;
    }

    const { error } = await supabase.from('approaches').insert({
      campaign_id: campaignId,
      unit_id: unitId,
      hostess_id: hostessId,
      group_size: row.groupSize,
      converted: row.converted,
      audience_profile_id: findById(audienceProfiles ?? [], row.profileName),
      interest_id: row.converted ? findById(interests ?? [], row.interestName) : null,
      loss_reason_id: !row.converted ? findById(lossReasons ?? [], row.lossReasonName) : null,
      competitor_id: !row.converted ? findById(competitors ?? [], row.competitorName) : null,
      notes: row.notes ?? null,
      created_at: row.timestamp ?? new Date().toISOString(),
      updated_by: profile.id,
    });

    if (error) errors++;
    else imported++;
  }

  return { imported, errors };
}
