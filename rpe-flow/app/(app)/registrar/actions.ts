'use server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { approachSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function registrarAbordagemAction(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const raw = {
    campaign_id: formData.get('campaign_id') as string,
    unit_id: formData.get('unit_id') as string,
    group_size: parseInt(formData.get('group_size') as string, 10),
    audience_profile_id: (formData.get('audience_profile_id') as string) || null,
    converted: formData.get('converted') === 'true',
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
