import { requireAuth } from '@/lib/auth';
import { getApproaches } from '@/lib/analytics/queries';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    campaignId?: string;
    unitId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ApproachesPage({ searchParams }: PageProps) {
  const profile = await requireAuth();
  const sp = await searchParams;

  const page = Number(sp.page || 1);
  const campaignId = sp.campaignId;
  const unitId = sp.unitId;
  const startDate = sp.startDate || '';
  const endDate = sp.endDate || '';

  // Hostess can only see their own approaches
  const hostessId = profile.role === 'hostess' ? profile.id : undefined;

  const { data, total, totalPages } = await getApproaches({
    page,
    pageSize: 20,
    campaignId,
    unitId,
    hostessId,
    startDate,
    endDate,
  });

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (campaignId) params.set('campaignId', campaignId);
    if (unitId) params.set('unitId', unitId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return `/approaches?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Histórico de Abordagens</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} abordagem{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={(() => {
              const params = new URLSearchParams();
              if (campaignId) params.set('campaignId', campaignId);
              if (unitId) params.set('unitId', unitId);
              if (startDate) params.set('startDate', startDate);
              if (endDate) params.set('endDate', endDate);
              const qs = params.toString();
              return `/approaches/export${qs ? `?${qs}` : ''}`;
            })()}
            className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Exportar CSV
          </Link>
          <Link
            href="/approach/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Nova Abordagem
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
              <th className="text-left py-3 px-4 font-medium">Data/Hora</th>
              <th className="text-left py-3 px-4 font-medium">Campanha</th>
              <th className="text-left py-3 px-4 font-medium">Unidade</th>
              {profile.role !== 'hostess' && (
                <th className="text-left py-3 px-4 font-medium">Hostess</th>
              )}
              <th className="text-left py-3 px-4 font-medium">Grupo</th>
              <th className="text-left py-3 px-4 font-medium">Converteu</th>
              <th className="text-left py-3 px-4 font-medium">Motivo / Interesse</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={profile.role !== 'hostess' ? 7 : 6}
                  className="py-8 text-center text-zinc-400"
                >
                  Nenhuma abordagem encontrada
                </td>
              </tr>
            ) : (
              data.map((a) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const row = a as any;
                const campaignName = row.campaigns?.name || '—';
                const unitName = row.units?.name || '—';
                const hostessName = row.profiles?.name || '—';
                const interestName = row.campaign_interests?.name;
                const lossReasonName = row.loss_reasons?.name;
                const detail = a.converted
                  ? interestName || '—'
                  : lossReasonName || '—';

                return (
                  <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="py-3 px-4 text-zinc-900">{campaignName}</td>
                    <td className="py-3 px-4 text-zinc-600">{unitName}</td>
                    {profile.role !== 'hostess' && (
                      <td className="py-3 px-4 text-zinc-600">{hostessName}</td>
                    )}
                    <td className="py-3 px-4 text-zinc-600">{a.group_size}</td>
                    <td className="py-3 px-4">
                      {a.converted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600">{detail}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-zinc-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
