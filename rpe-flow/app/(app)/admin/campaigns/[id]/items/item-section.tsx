'use client';

import { useState, useTransition } from 'react';

interface Item {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

interface Props {
  title: string;
  items: Item[];
  addAction: (campaignId: string, formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  deleteAction: (id: string) => Promise<{ success?: boolean; error?: string }>;
  campaignId: string;
}

export default function ItemSection({ title, items, addAction, deleteAction, campaignId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const boundAdd = addAction.bind(null, campaignId);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await boundAdd(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        form.reset();
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm('Deseja remover este item?')) return;

    startTransition(async () => {
      await deleteAction(id);
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 mb-4">Nenhum item cadastrado</p>
      ) : (
        <div className="mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 uppercase text-xs">
                <th className="text-left py-2 px-3 font-medium">Nome</th>
                <th className="text-left py-2 px-3 font-medium">Ordem</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 px-3 font-medium text-zinc-900">{item.name}</td>
                  <td className="py-2 px-3 text-zinc-600">{item.sort_order}</td>
                  <td className="py-2 px-3">
                    {item.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                      className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 items-end border-t border-zinc-100 pt-4">
        <div className="flex-1">
          <label className="text-xs font-medium text-zinc-600 mb-1 block">Nome</label>
          <input
            name="name"
            type="text"
            required
            placeholder="Nome do item"
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-24">
          <label className="text-xs font-medium text-zinc-600 mb-1 block">Ordem</label>
          <input
            name="sort_order"
            type="number"
            min="0"
            defaultValue="0"
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          Adicionar
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</p>
      )}
    </div>
  );
}
