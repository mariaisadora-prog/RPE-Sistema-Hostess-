import { requireAuth, getUserUnits } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RegistrarForm from './form';

export default async function RegistrarPage() {
  const profile = await requireAuth();
  const supabase = await createClient();

  // Resolve units accessible to this user
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

  const { data: units } = await supabase
    .from('units')
    .select('id, name')
    .in('id', unitIds.length > 0 ? unitIds : ['__none__'])
    .eq('active', true)
    .order('name');

  const autoUnit =
    (units ?? []).length === 1 ? (units ?? [])[0] : null;

  // Fetch active campaigns for accessible units
  const unitIdsForCampaigns = (units ?? []).map((u) => u.id);
  const { data: campaignUnits } = await supabase
    .from('campaign_units')
    .select('campaign_id, unit_id')
    .in('unit_id', unitIdsForCampaigns.length > 0 ? unitIdsForCampaigns : ['__none__']);

  const campaignIds = [...new Set((campaignUnits ?? []).map((cu) => cu.campaign_id))];

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .in('id', campaignIds.length > 0 ? campaignIds : ['__none__'])
    .eq('active', true)
    .order('name');

  const autoCampaign =
    (campaigns ?? []).length === 1 ? (campaigns ?? [])[0] : null;

  // Fetch options for the auto-selected campaign (if any)
  let audienceProfiles: { id: string; name: string }[] = [];
  let lossReasons: { id: string; name: string }[] = [];
  let interests: { id: string; name: string }[] = [];
  let competitors: { id: string; name: string }[] = [];

  if (autoCampaign) {
    const [apRes, lrRes, intRes, compRes] = await Promise.all([
      supabase
        .from('audience_profiles')
        .select('id, name')
        .eq('campaign_id', autoCampaign.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('loss_reasons')
        .select('id, name')
        .eq('campaign_id', autoCampaign.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('campaign_interests')
        .select('id, name')
        .eq('campaign_id', autoCampaign.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('competitors')
        .select('id, name')
        .eq('campaign_id', autoCampaign.id)
        .eq('active', true)
        .order('sort_order'),
    ]);
    audienceProfiles = apRes.data ?? [];
    lossReasons = lrRes.data ?? [];
    interests = intRes.data ?? [];
    competitors = compRes.data ?? [];
  }

  // Global requested items (not campaign-scoped)
  const { data: requestedItems } = await supabase
    .from('requested_items')
    .select('id, name')
    .eq('active', true)
    .order('name');

  return (
    <RegistrarForm
      hostessName={profile.name}
      campaigns={campaigns ?? []}
      units={units ?? []}
      autoCampaign={autoCampaign}
      autoUnit={autoUnit}
      audienceProfilesInit={audienceProfiles}
      lossReasonsInit={lossReasons}
      interestsInit={interests}
      competitorsInit={competitors}
      requestedItems={requestedItems ?? []}
    />
  );
}
