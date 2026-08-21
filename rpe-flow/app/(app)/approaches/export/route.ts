'use server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { generateCSV, formatDateTime } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const profile = await requireAuth().catch(() => null);
  if (!profile) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const campaignId = sp.get('campaignId') || undefined;
  const unitId = sp.get('unitId') || undefined;
  const startDate = sp.get('startDate') || undefined;
  const endDate = sp.get('endDate') || undefined;
  // Hostess only sees own approaches
  const hostessId = profile.role === 'hostess' ? profile.id : (sp.get('hostessId') || undefined);

  const supabase = await createClient();

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
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (unitId) query = query.eq('unit_id', unitId);
  if (hostessId) query = query.eq('hostess_id', hostessId);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) {
    return new NextResponse('Erro ao buscar dados', { status: 500 });
  }

  const headers = [
    'Data/Hora',
    'Campanha',
    'Unidade',
    'Hostess',
    'Tamanho do grupo',
    'Converteu',
    'Perfil de público',
    'Interesse',
    'Motivo de rejeição',
    'Concorrente',
    'Observação',
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data || []).map((a: any) => [
    formatDateTime(a.created_at),
    a.campaigns?.name || '',
    a.units?.name || '',
    a.profiles?.name || '',
    String(a.group_size),
    a.converted ? 'Sim' : 'Não',
    a.audience_profiles?.name || '',
    a.converted ? (a.campaign_interests?.name || '') : '',
    !a.converted ? (a.loss_reasons?.name || '') : '',
    a.competitors?.name || '',
    a.notes || '',
  ]);

  const csv = generateCSV(headers, rows);

  const filename = `abordagens-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
