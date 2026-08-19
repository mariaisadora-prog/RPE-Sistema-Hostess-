'use server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { auxiliaryItemSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

// ---- Audience Profiles ----

export async function addAudienceProfileAction(campaignId: string, formData: FormData) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const parsed = auxiliaryItemSchema.safeParse({
    name: formData.get('name') as string,
    sort_order: Number(formData.get('sort_order') || 0),
    active: true,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from('audience_profiles')
    .insert({ ...parsed.data, campaign_id: campaignId });

  if (error) return { error: 'Erro ao adicionar perfil de público.' };

  revalidatePath(`/admin/campaigns/${campaignId}/items`);
  return { success: true };
}

export async function deleteAudienceProfileAction(id: string) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('audience_profiles')
    .select('campaign_id')
    .eq('id', id)
    .single();

  await supabase.from('audience_profiles').delete().eq('id', id);

  if (item?.campaign_id) {
    revalidatePath(`/admin/campaigns/${item.campaign_id}/items`);
  }
  return { success: true };
}

// ---- Interests ----

export async function addInterestAction(campaignId: string, formData: FormData) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const parsed = auxiliaryItemSchema.safeParse({
    name: formData.get('name') as string,
    sort_order: Number(formData.get('sort_order') || 0),
    active: true,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from('campaign_interests')
    .insert({ ...parsed.data, campaign_id: campaignId });

  if (error) return { error: 'Erro ao adicionar interesse.' };

  revalidatePath(`/admin/campaigns/${campaignId}/items`);
  return { success: true };
}

export async function deleteInterestAction(id: string) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('campaign_interests')
    .select('campaign_id')
    .eq('id', id)
    .single();

  await supabase.from('campaign_interests').delete().eq('id', id);

  if (item?.campaign_id) {
    revalidatePath(`/admin/campaigns/${item.campaign_id}/items`);
  }
  return { success: true };
}

// ---- Loss Reasons ----

export async function addLossReasonAction(campaignId: string, formData: FormData) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const parsed = auxiliaryItemSchema.safeParse({
    name: formData.get('name') as string,
    sort_order: Number(formData.get('sort_order') || 0),
    active: true,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from('loss_reasons')
    .insert({ ...parsed.data, campaign_id: campaignId });

  if (error) return { error: 'Erro ao adicionar motivo de perda.' };

  revalidatePath(`/admin/campaigns/${campaignId}/items`);
  return { success: true };
}

export async function deleteLossReasonAction(id: string) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('loss_reasons')
    .select('campaign_id')
    .eq('id', id)
    .single();

  await supabase.from('loss_reasons').delete().eq('id', id);

  if (item?.campaign_id) {
    revalidatePath(`/admin/campaigns/${item.campaign_id}/items`);
  }
  return { success: true };
}

// ---- Competitors ----

export async function addCompetitorAction(campaignId: string, formData: FormData) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const parsed = auxiliaryItemSchema.safeParse({
    name: formData.get('name') as string,
    sort_order: Number(formData.get('sort_order') || 0),
    active: true,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from('competitors')
    .insert({ ...parsed.data, campaign_id: campaignId });

  if (error) return { error: 'Erro ao adicionar concorrente.' };

  revalidatePath(`/admin/campaigns/${campaignId}/items`);
  return { success: true };
}

export async function deleteCompetitorAction(id: string) {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('competitors')
    .select('campaign_id')
    .eq('id', id)
    .single();

  await supabase.from('competitors').delete().eq('id', id);

  if (item?.campaign_id) {
    revalidatePath(`/admin/campaigns/${item.campaign_id}/items`);
  }
  return { success: true };
}
