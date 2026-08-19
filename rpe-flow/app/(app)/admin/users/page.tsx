import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const roleBadge: Record<string, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
  manager: { label: 'Gestor', className: 'bg-blue-100 text-blue-800' },
  hostess: { label: 'Hostess', className: 'bg-emerald-100 text-emerald-800' },
};

export default async function UsersPage() {
  await requireRole(['admin']);
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('*, user_units(unit_id, units(name))')
    .order('name');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuários</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie os usuários do sistema</p>
        </div>
        <Link
          href="/admin/users/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Novo Usuário
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
              <th className="text-left py-3 px-4 font-medium">Nome</th>
              <th className="text-left py-3 px-4 font-medium">E-mail</th>
              <th className="text-left py-3 px-4 font-medium">Perfil</th>
              <th className="text-left py-3 px-4 font-medium">Unidades</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!users || users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-400">
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const badge = roleBadge[u.role] ?? {
                  label: u.role,
                  className: 'bg-zinc-100 text-zinc-600',
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const unitNames = (u as any).user_units
                  ?.map((uu: { units: { name: string } | null }) => uu.units?.name)
                  .filter(Boolean)
                  .join(', ') || '—';

                return (
                  <tr key={u.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 px-4 font-medium text-zinc-900">{u.name}</td>
                    <td className="py-3 px-4 text-zinc-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{unitNames}</td>
                    <td className="py-3 px-4">
                      {u.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/users/${u.id}/edit`}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
