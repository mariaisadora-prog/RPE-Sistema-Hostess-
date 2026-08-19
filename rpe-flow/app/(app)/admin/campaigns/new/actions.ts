'use server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { campaignSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function createCampaignAction(formData: FormData) {
  const profile = await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || '',
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    active: true,
    unit_ids: formData.getAll('unit_ids') as string[],
  };

  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { unit_ids, ...campaignData } = parsed.data;

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({ ...campaignData, created_by: profile.id })
    .select('id')
    .single();

  if (campaignError || !campaign) {
    return { error: 'Erro ao criar campanha.' };
  }

  const unitEntries = unit_ids.map((uid) => ({
    campaign_id: campaign.id,
    unit_id: uid,
  }));

  const { error: unitsError } = await supabase
    .from('campaign_units')
    .insert(unitEntries);

  if (unitsError) {
    return { error: 'Erro ao associar unidades à campanha.' };
  }

  revalidatePath('/admin/campaigns');
  return { success: true };
}
