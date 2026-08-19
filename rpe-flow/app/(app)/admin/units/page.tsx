import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function UnitsPage() {
  await requireRole(['admin']);
  const supabase = await createClient();

  const { data: units } = await supabase
    .from('units')
    .select('*')
    .order('name');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Unidades</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie as unidades do sistema</p>
        </div>
        <Link
          href="/admin/units/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Nova Unidade
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
              <th className="text-left py-3 px-4 font-medium">Nome</th>
              <th className="text-left py-3 px-4 font-medium">Slug</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!units || units.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-400">
                  Nenhuma unidade encontrada
                </td>
              </tr>
            ) : (
              units.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-3 px-4 font-medium text-zinc-900">{u.name}</td>
                  <td className="py-3 px-4 text-zinc-600 font-mono text-xs">{u.slug}</td>
                  <td className="py-3 px-4">
                    {u.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                        Inativa
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/units/${u.id}/edit`}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
