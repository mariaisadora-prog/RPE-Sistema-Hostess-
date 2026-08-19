import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default async function CampaignsPage() {
  await requireRole(['admin', 'manager']);
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, campaign_units(unit_id)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Campanhas</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie as campanhas do sistema</p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Nova Campanha
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
              <th className="text-left py-3 px-4 font-medium">Nome</th>
              <th className="text-left py-3 px-4 font-medium">Período</th>
              <th className="text-left py-3 px-4 font-medium">Unidades</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!campaigns || campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-400">
                  Nenhuma campanha encontrada
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-3 px-4 font-medium text-zinc-900">{c.name}</td>
                  <td className="py-3 px-4 text-zinc-600">
                    {formatDate(c.start_date)} &ndash; {formatDate(c.end_date)}
                  </td>
                  <td className="py-3 px-4 text-zinc-600">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(c as any).campaign_units?.length ?? 0}
                  </td>
                  <td className="py-3 px-4">
                    {c.active ? (
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
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/campaigns/${c.id}/edit`}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/admin/campaigns/${c.id}/items`}
                        className="text-zinc-600 hover:text-zinc-700 text-sm font-medium"
                      >
                        Itens
                      </Link>
                    </div>
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
