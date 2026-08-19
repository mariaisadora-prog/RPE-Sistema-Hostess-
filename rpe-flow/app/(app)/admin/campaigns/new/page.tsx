import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import CampaignForm from './form';

export default async function NewCampaignPage() {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const { data: units } = await supabase
    .from('units')
    .select('id, name')
    .eq('active', true)
    .order('name');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Nova Campanha</h1>
        <p className="text-sm text-zinc-500 mt-1">Crie uma nova campanha de abordagem</p>
      </div>

      <div className="max-w-lg bg-white rounded-xl shadow-sm border border-zinc-100 p-6">
        <CampaignForm units={units ?? []} />
      </div>
    </div>
  );
}
