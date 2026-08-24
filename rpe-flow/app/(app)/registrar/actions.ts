'use server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { approachSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function registrarAbordagemAction(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const groupSize = parseInt(formData.get('group_size') as string, 10);
  const outcome = formData.get('outcome') as string;

  // Compute people counts from outcome + group_size
  let peopleEntered: number;
  let peopleRejected: number;

  if (outcome === 'entered') {
    peopleEntered = groupSize;
    peopleRejected = 0;
  } else if (outcome === 'rejected') {
    peopleEntered = 0;
    peopleRejected = groupSize;
  } else {
    // partial
    peopleEntered = parseInt(formData.get('people_entered') as string, 10) || 0;
    peopleRejected = groupSize - peopleEntered;
  }

  const existsOnMenuRaw = formData.get('exists_on_menu') as string | null;
  let existsOnMenu: boolean | null = null;
  if (existsOnMenuRaw === 'true') existsOnMenu = true;
  else if (existsOnMenuRaw === 'false') existsOnMenu = false;

  const raw = {
    campaign_id: formData.get('campaign_id') as string,
    unit_id: formData.get('unit_id') as string,
    group_size: groupSize,
    audience_profile_id: (formData.get('audience_profile_id') as string) || null,
    outcome: outcome as 'entered' | 'rejected' | 'partial',
    people_entered: peopleEntered,
    people_rejected: peopleRejected,
    specific_demand: formData.get('specific_demand') === 'true',
    requested_item_id: (formData.get('requested_item_id') as string) || null,
    requested_item_text: (formData.get('requested_item_text') as string) || null,
    exists_on_menu: existsOnMenu,
    interest_id: (formData.get('interest_id') as string) || null,
    loss_reason_id: (formData.get('loss_reason_id') as string) || null,
    competitor_id: (formData.get('competitor_id') as string) || null,
    notes: (formData.get('notes') as string) || '',
  };

  const parsed = approachSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from('approaches').insert({
    ...parsed.data,
    converted: outcome === 'entered',
    hostess_id: profile.id,
  });

  if (error) return { error: 'Não foi possível registrar a abordagem. Tente novamente.' };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getCampaignOptionsAction(campaignId: string) {
  const supabase = await createClient();
  const [apRes, lrRes, intRes, compRes] = await Promise.all([
    supabase.from('audience_profiles').select('id, name').eq('campaign_id', campaignId).eq('active', true).order('sort_order'),
    supabase.from('loss_reasons').select('id, name').eq('campaign_id', campaignId).eq('active', true).order('sort_order'),
    supabase.from('campaign_interests').select('id, name').eq('campaign_id', campaignId).eq('active', true).order('sort_order'),
    supabase.from('competitors').select('id, name').eq('campaign_id', campaignId).eq('active', true).order('sort_order'),
  ]);
  return {
    audienceProfiles: apRes.data ?? [],
    lossReasons: lrRes.data ?? [],
    interests: intRes.data ?? [],
    competitors: compRes.data ?? [],
  };
}
