import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from './sidebar';

async function logoutAction() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} logoutAction={logoutAction} />
      <main className="ml-56 min-h-screen bg-zinc-50 p-8 flex-1">
        {children}
      </main>
    </div>
  );
}
