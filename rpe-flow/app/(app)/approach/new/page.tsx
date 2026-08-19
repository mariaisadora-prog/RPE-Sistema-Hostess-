import { requireAuth, getUserUnits } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { PageProps } from 'next';
import ApproachForm from './form';

export default async function NewApproachPage({ searchParams }: PageProps) {
  const profile = await requireAuth();
  const sp = await searchParams;
  const selectedCampaignId = sp.campaign_id as string | undefined;

  const supabase = await createClient();

  // Get user's units — admin sees all active units
  let unitIds: string[];
  if (profile.role === 'admin') {
    const { data: allUnits } = await supabase
      .from('units')
      .select('id')
      .eq('active', true);
    unitIds = allUnits?.map((u) => u.id) ?? [];
  } else {
    unitIds = await getUserUnits(profile.id);
  }

  // Fetch active campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('active', true)
    .order('name');

  // Fetch units accessible to this user
  const { data: units } = await supabase
    .from('units')
    .select('id, name')
    .in('id', unitIds.length > 0 ? unitIds : ['__none__'])
    .eq('active', true)
    .order('name');

  // Fetch campaign-specific data when a campaign is selected
  let audienceProfiles: { id: string; name: string }[] = [];
  let lossReasons: { id: string; name: string }[] = [];
  let interests: { id: string; name: string }[] = [];
  let competitors: { id: string; name: string }[] = [];

  if (selectedCampaignId) {
    const [apResult, lrResult, intResult, compResult] = await Promise.all([
      supabase
        .from('audience_profiles')
        .select('id, name')
        .eq('campaign_id', selectedCampaignId)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('loss_reasons')
        .select('id, name')
        .eq('campaign_id', selectedCampaignId)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('campaign_interests')
        .select('id, name')
        .eq('campaign_id', selectedCampaignId)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('competitors')
        .select('id, name')
        .eq('campaign_id', selectedCampaignId)
        .eq('active', true)
        .order('sort_order'),
    ]);
    audienceProfiles = apResult.data ?? [];
    lossReasons = lrResult.data ?? [];
    interests = intResult.data ?? [];
    competitors = compResult.data ?? [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Nova Abordagem</h1>
        <p className="text-sm text-zinc-500 mt-1">Registre uma nova abordagem</p>
      </div>

      <div className="max-w-lg bg-white rounded-xl shadow-sm border border-zinc-100 p-6">
        <ApproachForm
          campaigns={campaigns ?? []}
          units={units ?? []}
          audienceProfiles={audienceProfiles}
          lossReasons={lossReasons}
          interests={interests}
          competitors={competitors}
          selectedCampaignId={selectedCampaignId ?? ''}
        />
      </div>
    </div>
  );
}
