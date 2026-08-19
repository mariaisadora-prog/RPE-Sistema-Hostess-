import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import EditUserForm from './form';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 mb-4">Usuário não encontrado</p>
        <Link
          href="/admin/users"
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          Voltar para usuários
        </Link>
      </div>
    );
  }

  const [{ data: userUnits }, { data: units }] = await Promise.all([
    supabase.from('user_units').select('unit_id').eq('user_id', id),
    supabase.from('units').select('id, name').order('name'),
  ]);

  const selectedUnitIds = userUnits?.map((uu) => uu.unit_id) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Editar Usuário</h1>
          <p className="text-sm text-zinc-500 mt-1">{user.name}</p>
        </div>
        <Link
          href="/admin/users"
          className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Voltar
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 max-w-lg">
        <EditUserForm
          user={user}
          units={units || []}
          selectedUnitIds={selectedUnitIds}
        />
      </div>
    </div>
  );
}
