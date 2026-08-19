import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ItemSection from './item-section';
import {
  addAudienceProfileAction,
  deleteAudienceProfileAction,
  addInterestAction,
  deleteInterestAction,
  addLossReasonAction,
  deleteLossReasonAction,
  addCompetitorAction,
  deleteCompetitorAction,
} from './actions';

export default async function CampaignItemsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin', 'manager']);
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
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

  const [
    { data: audienceProfiles },
    { data: interests },
    { data: lossReasons },
    { data: competitors },
  ] = await Promise.all([
    supabase.from('audience_profiles').select('*').eq('campaign_id', id).order('sort_order'),
    supabase.from('campaign_interests').select('*').eq('campaign_id', id).order('sort_order'),
    supabase.from('loss_reasons').select('*').eq('campaign_id', id).order('sort_order'),
    supabase.from('competitors').select('*').eq('campaign_id', id).order('sort_order'),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Itens da Campanha</h1>
          <p className="text-sm text-zinc-500 mt-1">{campaign.name}</p>
        </div>
        <Link
          href="/admin/campaigns"
          className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Voltar
        </Link>
      </div>

      <div className="space-y-6">
        <ItemSection
          title="Perfis de Público"
          items={audienceProfiles || []}
          addAction={addAudienceProfileAction}
          deleteAction={deleteAudienceProfileAction}
          campaignId={id}
        />
        <ItemSection
          title="Interesses"
          items={interests || []}
          addAction={addInterestAction}
          deleteAction={deleteInterestAction}
          campaignId={id}
        />
        <ItemSection
          title="Motivos de Perda"
          items={lossReasons || []}
          addAction={addLossReasonAction}
          deleteAction={deleteLossReasonAction}
          campaignId={id}
        />
        <ItemSection
          title="Concorrentes"
          items={competitors || []}
          addAction={addCompetitorAction}
          deleteAction={deleteCompetitorAction}
          campaignId={id}
        />
      </div>
    </div>
  );
}
