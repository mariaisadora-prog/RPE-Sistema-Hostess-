'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateUserAction } from './actions';

interface Unit {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface Props {
  user: User;
  units: Unit[];
  selectedUnitIds: string[];
}

export default function EditUserForm({ user, units, selectedUnitIds }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const boundAction = updateUserAction.bind(null, user.id);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await boundAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Usuário atualizado com sucesso!
        </p>
        <Link
          href="/admin/users"
          className="inline-block border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Ver usuários
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Nome *</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={user.name}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">E-mail</label>
        <input
          type="text"
          value={user.email}
          disabled
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full bg-zinc-50 text-zinc-500 cursor-not-allowed"
        />
        <p className="text-xs text-zinc-400 mt-1">O e-mail não pode ser alterado aqui.</p>
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Perfil *</label>
        <select
          name="role"
          required
          defaultValue={user.role}
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
                  defaultChecked={selectedUnitIds.includes(u.id)}
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
            defaultChecked={user.active}
            className="accent-emerald-600"
          />
          <span className="text-sm font-medium text-zinc-700">Usuário ativo</span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href="/admin/users"
          className="flex-1 text-center border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
