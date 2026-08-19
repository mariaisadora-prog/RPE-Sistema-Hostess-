import { requireRole } from '@/lib/auth';
import Link from 'next/link';
import UnitForm from './form';

export default async function NewUnitPage() {
  await requireRole(['admin']);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Nova Unidade</h1>
          <p className="text-sm text-zinc-500 mt-1">Cadastre uma nova unidade no sistema</p>
        </div>
        <Link
          href="/admin/units"
          className="border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Voltar
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 max-w-lg">
        <UnitForm />
      </div>
    </div>
  );
}
