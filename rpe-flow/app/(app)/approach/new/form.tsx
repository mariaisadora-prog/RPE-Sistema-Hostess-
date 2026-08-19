'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createApproachAction } from './actions';

interface Option {
  id: string;
  name: string;
}

interface ApproachFormProps {
  campaigns: Option[];
  units: Option[];
  audienceProfiles: Option[];
  lossReasons: Option[];
  interests: Option[];
  competitors: Option[];
  selectedCampaignId: string;
}

export default function ApproachForm({
  campaigns,
  units,
  audienceProfiles,
  lossReasons,
  interests,
  competitors,
  selectedCampaignId,
}: ApproachFormProps) {
  const router = useRouter();
  const [converted, setConverted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCampaignChange(campaignId: string) {
    if (campaignId) {
      router.push(`/approach/new?campaign_id=${campaignId}`);
    } else {
      router.push('/approach/new');
    }
  }

  function handleNewApproach() {
    setSuccess(false);
    setConverted(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createApproachAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-emerald-600 text-5xl mb-4">&#10003;</div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Abordagem registrada!</h2>
        <p className="text-sm text-zinc-500 mb-6">A abordagem foi salva com sucesso.</p>
        <button
          onClick={handleNewApproach}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Nova abordagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campaign */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Campanha *</label>
        <select
          name="campaign_id"
          required
          value={selectedCampaignId}
          onChange={(e) => handleCampaignChange(e.target.value)}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Selecione uma campanha</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Unit */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Unidade *</label>
        <select
          name="unit_id"
          required
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Selecione uma unidade</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Group size */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">
          Tamanho do grupo *
        </label>
        <input
          name="group_size"
          type="number"
          required
          min={1}
          max={50}
          defaultValue={1}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Audience profile */}
      {audienceProfiles.length > 0 && (
        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">
            Perfil do público
          </label>
          <select
            name="audience_profile_id"
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Não identificado</option>
            {audienceProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Converted */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-2 block">Entrou? *</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="converted"
              value="true"
              required
              onChange={() => setConverted(true)}
              className="accent-emerald-600"
            />
            <span className="text-sm text-zinc-700">Sim</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="converted"
              value="false"
              onChange={() => setConverted(false)}
              className="accent-emerald-600"
            />
            <span className="text-sm text-zinc-700">Não</span>
          </label>
        </div>
      </div>

      {/* If converted: interest */}
      {converted === true && interests.length > 0 && (
        <div>
          <label className="text-sm font-medium text-zinc-700 mb-1 block">Interesse</label>
          <select
            name="interest_id"
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Não informado</option>
            {interests.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* If not converted: loss reason + competitor */}
      {converted === false && (
        <>
          {lossReasons.length > 0 && (
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1 block">
                Motivo da recusa
              </label>
              <select
                name="loss_reason_id"
                className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Não informado</option>
                {lossReasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {competitors.length > 0 && (
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1 block">Concorrente</label>
              <select
                name="competitor_id"
                className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Não identificado</option>
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">Observação</label>
        <textarea
          name="notes"
          rows={3}
          maxLength={300}
          placeholder="Observações opcionais..."
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Salvando...' : 'Registrar abordagem'}
      </button>
    </form>
  );
}
