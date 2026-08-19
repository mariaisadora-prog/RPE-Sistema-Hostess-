'use server';
import { requireRole } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { userSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function createUserAction(formData: FormData) {
  await requireRole(['admin']);
  const supabase = createServiceRoleClient();

  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role: formData.get('role') as string,
    active: formData.get('active') === 'true',
    unit_ids: formData.getAll('unit_ids') as string[],
  };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Create auth user via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: `Erro ao criar usuário: ${authError?.message ?? 'Erro desconhecido'}` };
  }

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      auth_user_id: authData.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      active: parsed.data.active,
    })
    .select('id')
    .single();

  if (profileError || !profile) {
    return { error: 'Erro ao criar perfil do usuário.' };
  }

  // Associate units
  if (parsed.data.unit_ids.length > 0) {
    const unitEntries = parsed.data.unit_ids.map((uid) => ({
      user_id: profile.id,
      unit_id: uid,
    }));
    await supabase.from('user_units').insert(unitEntries);
  }

  revalidatePath('/admin/users');
  return { success: true };
}
