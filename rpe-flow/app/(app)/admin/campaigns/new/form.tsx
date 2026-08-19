'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaignAction } from './actions';

interface Unit {
  id: string;
  name: string;
}

export default function CampaignForm({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createCampaignAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/admin/campaigns');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Nome *</label>
        <input
          name="name"
          type="text"
          required
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Descrição</label>
        <textarea
          name="description"
          rows={3}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">
            Data de início *
          </label>
          <input
            name="start_date"
            type="date"
            required
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">Data de fim *</label>
          <input
            name="end_date"
            type="date"
            required
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-2 block">Unidades *</label>
        <div className="space-y-2 max-h-48 overflow-y-auto border border-zinc-200 rounded-lg p-3">
          {units.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhuma unidade disponível</p>
          ) : (
            units.map((u) => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="unit_ids"
                  value={u.id}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-zinc-700">{u.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando...' : 'Criar campanha'}
        </button>
      </div>
    </form>
  );
}
