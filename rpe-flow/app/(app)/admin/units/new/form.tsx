'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { createUnitAction } from './actions';

export default function UnitForm() {
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugEdited) {
      setSlug(slugify(e.target.value));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true);
    setSlug(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createUnitAction(formData);
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
          Unidade criada com sucesso!
        </p>
        <Link
          href="/admin/units"
          className="inline-block border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Ver unidades
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
          onChange={handleNameChange}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Slug *</label>
        <input
          name="slug"
          type="text"
          required
          value={slug}
          onChange={handleSlugChange}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
        />
        <p className="text-xs text-zinc-400 mt-1">
          Identificador único usado nas URLs. Gerado automaticamente a partir do nome.
        </p>
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
          <span className="text-sm font-medium text-zinc-700">Unidade ativa</span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href="/admin/units"
          className="flex-1 text-center border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Criando...' : 'Criar unidade'}
        </button>
      </div>
    </form>
  );
}
