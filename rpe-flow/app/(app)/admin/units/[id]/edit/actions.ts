'use server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { unitSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function updateUnitAction(unitId: string, formData: FormData) {
  await requireRole(['admin']);
  const supabase = await createClient();

  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    active: formData.get('active') === 'true',
  };

  const parsed = unitSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from('units')
    .update(parsed.data)
    .eq('id', unitId);

  if (error) {
    if (error.code === '23505') {
      return { error: 'Já existe uma unidade com esse slug.' };
    }
    return { error: 'Erro ao atualizar unidade.' };
  }

  revalidatePath('/admin/units');
  revalidatePath(`/admin/units/${unitId}/edit`);
  return { success: true };
}
