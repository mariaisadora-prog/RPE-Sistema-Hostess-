'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUserAction } from './actions';

interface Unit {
  id: string;
  name: string;
}

export default function UserForm({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/admin/users');
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
        <label className="text-sm font-medium text-zinc-700 mb-1 block">E-mail *</label>
        <input
          name="email"
          type="email"
          required
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Senha *</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Perfil *</label>
        <select
          name="role"
          required
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Selecione o perfil</option>
          <option value="admin">Administrador</option>
          <option value="manager">Gestor</option>
          <option value="hostess">Hostess</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-2 block">Unidades</label>
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

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked
            className="accent-emerald-600"
          />
          <span className="text-sm font-medium text-zinc-700">Usuário ativo</span>
        </label>
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
          {isPending ? 'Criando...' : 'Criar usuário'}
        </button>
      </div>
    </form>
  );
}
