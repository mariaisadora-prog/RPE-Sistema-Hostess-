'use server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { campaignSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function updateCampaignAction(campaignId: string, formData: FormData) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || '',
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    active: formData.get('active') === 'true',
    unit_ids: formData.getAll('unit_ids') as string[],
  };

  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { unit_ids, ...campaignData } = parsed.data;

  const { error: updateError } = await supabase
    .from('campaigns')
    .update(campaignData)
    .eq('id', campaignId);

  if (updateError) {
    return { error: 'Erro ao atualizar campanha.' };
  }

  await supabase.from('campaign_units').delete().eq('campaign_id', campaignId);

  const unitEntries = unit_ids.map((uid) => ({
    campaign_id: campaignId,
    unit_id: uid,
  }));

  if (unitEntries.length > 0) {
    const { error: unitsError } = await supabase.from('campaign_units').insert(unitEntries);
    if (unitsError) {
      return { error: 'Erro ao atualizar unidades da campanha.' };
    }
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${campaignId}/edit`);
  return { success: true };
}
