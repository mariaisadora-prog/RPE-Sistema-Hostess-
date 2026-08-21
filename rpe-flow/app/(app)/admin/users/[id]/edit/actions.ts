'use server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  role: z.enum(['admin', 'manager', 'hostess']),
  active: z.boolean().default(true),
  unit_ids: z.array(z.string().uuid()).default([]),
});

export async function updateUserAction(userId: string, formData: FormData) {
  await requireRole(['admin']);
  const supabase = await createClient();

  const raw = {
    name: formData.get('name') as string,
    role: formData.get('role') as string,
    active: formData.get('active') === 'true',
    unit_ids: formData.getAll('unit_ids') as string[],
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { unit_ids, ...profileData } = parsed.data;

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId);

  if (profileError) {
    return { error: 'Erro ao atualizar usuário.' };
  }

  await supabase.from('user_units').delete().eq('user_id', userId);

  if (unit_ids.length > 0) {
    const unitEntries = unit_ids.map((uid) => ({
      user_id: userId,
      unit_id: uid,
    }));
    const { error: unitsError } = await supabase.from('user_units').insert(unitEntries);
    if (unitsError) {
      return { error: 'Erro ao atualizar unidades do usuário.' };
    }
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}/edit`);
  return { success: true };
}
