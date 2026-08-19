import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import EditUnitForm from './form';

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from('units')
    .select('*')
    .eq('id', id)
    .single();

  if (!unit) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 mb-4">Unidade não encontrada</p>
        <Link
          href="/admin/units"
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          Voltar para unidades
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Editar Unidade</h1>
          <p className="text-sm text-zinc-500 mt-1">{unit.name}</p>
        </div>
        <Link
          href="/admin/units"
          className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Voltar
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 max-w-lg">
        <EditUnitForm unit={unit} />
      </div>
    </div>
  );
}
