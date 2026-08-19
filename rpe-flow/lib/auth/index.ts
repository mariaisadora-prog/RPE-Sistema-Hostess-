import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types';

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  return profile;
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
