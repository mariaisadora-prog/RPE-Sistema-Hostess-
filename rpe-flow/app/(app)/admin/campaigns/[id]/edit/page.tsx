import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import EditCampaignForm from './form';

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin', 'manager']);
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 mb-4">Campanha não encontrada</p>
        <Link
          href="/admin/campaigns"
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          Voltar para campanhas
        </Link>
      </div>
    );
  }

  const [{ data: campaignUnits }, { data: units }] = await Promise.all([
    supabase.from('campaign_units').select('unit_id').eq('campaign_id', id),
    supabase.from('units').select('id, name').order('name'),
  ]);

  const selectedUnitIds = campaignUnits?.map((cu) => cu.unit_id) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Editar Campanha</h1>
          <p className="text-sm text-zinc-500 mt-1">{campaign.name}</p>
        </div>
        <Link
          href="/admin/campaigns"
          className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Voltar
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 max-w-2xl">
        <EditCampaignForm
          campaign={campaign}
          units={units || []}
          selectedUnitIds={selectedUnitIds}
        />
      </div>
    </div>
  );
}
