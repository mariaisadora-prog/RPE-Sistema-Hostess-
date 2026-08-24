import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try canonical schema (post-migration-006: has auth_user_id column)
  const { data: byAuthId, error: e1 } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!e1 && byAuthId) {
    return byAuthId as Profile;
  }

  // Fallback: pre-migration schema where profiles.id = auth.users.id
  const { data: byId } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!byId) return null;

  // Normalize to Profile shape
  const raw = byId as Record<string, unknown>;
  return {
    id: raw.id as string,
    auth_user_id: user.id,
    name: (raw.name ?? raw.full_name ?? user.email ?? 'Usuário') as string,
    email: (raw.email ?? user.email ?? '') as string,
    role: (raw.role ?? 'hostess') as UserRole,
    active: (raw.active ?? true) as boolean,
    created_at: raw.created_at as string,
    updated_at: (raw.updated_at ?? raw.created_at) as string,
  } satisfies Profile;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) {
    redirect('/login');
  }
  return profile;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<Profile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard');
  }
  return profile;
}

export async function getUserUnits(userId: string): Promise<string[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('user_units')
    .select('unit_id')
    .eq('user_id', userId);

  return data?.map((uu) => uu.unit_id) || [];
}

export async function canAccessUnit(userId: string, unitId: string, role: UserRole): Promise<boolean> {
  if (role === 'admin') return true;
  
  const units = await getUserUnits(userId);
  return units.includes(unitId);
}
