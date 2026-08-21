'use client';

import { useState, useTransition, useCallback } from 'react';
import { registrarAbordagemAction, getCampaignOptionsAction } from './actions';
import { formatTime } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
}

interface RegistrarFormProps {
  hostessName: string;
  campaigns: Option[];
  units: Option[];
  autoCampaign: Option | null;
  autoUnit: Option | null;
  audienceProfilesInit: Option[];
  lossReasonsInit: Option[];
  interestsInit: Option[];
  competitorsInit: Option[];
}

interface SuccessInfo {
  groupSize: number;
  converted: boolean;
  time: string;
}

export default function RegistrarForm({
  hostessName,
  campaigns,
  units,
  autoCampaign,
  autoUnit,
  audienceProfilesInit,
  lossReasonsInit,
  interestsInit,
  competitorsInit,
}: RegistrarFormProps) {
  const [campaignId, setCampaignId] = useState(autoCampaign?.id ?? '');
  const [unitId, setUnitId] = useState(autoUnit?.id ?? '');
  const [groupSize, setGroupSize] = useState(2);
  const [profileId, setProfileId] = useState('');
  const [converted, setConverted] = useState<boolean | null>(null);
  const [interestId, setInterestId] = useState('');
  const [lossReasonId, setLossReasonId] = useState('');
  const [identifiedCompetitor, setIdentifiedCompetitor] = useState<boolean | null>(null);
  const [competitorId, setCompetitorId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [isPending, startTransition] = useTransition();

  const [audienceProfiles, setAudienceProfiles] = useState(audienceProfilesInit);
  const [lossReasons, setLossReasons] = useState(lossReasonsInit);
  const [interests, setInterests] = useState(interestsInit);
  const [competitors, setCompetitors] = useState(competitorsInit);

  const currentCampaign = autoCampaign ?? campaigns.find((c) => c.id === campaignId);
  const currentUnit = autoUnit ?? units.find((u) => u.id === unitId);

  const handleCampaignChange = useCallback(
    async (id: string) => {
      setCampaignId(id);
      setProfileId('');
      setInterestId('');
      setLossReasonId('');
      setCompetitorId('');
      setIdentifiedCompetitor(null);
      if (id) {
        const opts = await getCampaignOptionsAction(id);
        setAudienceProfiles(opts.audienceProfiles);
        setLossReasons(opts.lossReasons);
        setInterests(opts.interests);
        setCompetitors(opts.competitors);
      }
    },
    []
  );

  function resetForm() {
    setGroupSize(2);
    setProfileId('');
    setConverted(null);
    setInterestId('');
    setLossReasonId('');
    setIdentifiedCompetitor(null);
    setCompetitorId('');
    setNotes('');
    setError(null);
    setSuccess(null);
  }

  function handleSubmit() {
    if (!campaignId || !unitId || converted === null) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set('campaign_id', campaignId);
    formData.set('unit_id', unitId);
    formData.set('group_size', String(groupSize));
    if (profileId) formData.set('audience_profile_id', profileId);
    formData.set('converted', String(converted));
    if (converted && interestId) formData.set('interest_id', interestId);
    if (!converted && lossReasonId) formData.set('loss_reason_id', lossReasonId);
    if (!converted && identifiedCompetitor && competitorId) formData.set('competitor_id', competitorId);
    if (notes) formData.set('notes', notes);

    startTransition(async () => {
      const result = await registrarAbordagemAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess({ groupSize, converted: converted!, time: formatTime(new Date().toISOString()) });
      }
    });
  }

  // ── Success screen ────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-50 mb-2">Abordagem registrada!</h2>
          <div className="text-zinc-400 text-sm space-y-1 mb-8">
            <p>{success.groupSize} {success.groupSize === 1 ? 'pessoa' : 'pessoas'}</p>
            <p className={success.converted ? 'text-emerald-400' : 'text-zinc-400'}>
              {success.converted ? 'Grupo entrou ✓' : 'Grupo não entrou'}
            </p>
            <p className="text-zinc-500">{success.time}</p>
          </div>
          <button
            onClick={resetForm}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg py-4 rounded-2xl transition-colors"
          >
            NOVA ABORDAGEM
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────
  const formReady = !!campaignId && !!unitId;

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-4 py-3 text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'RPE FLOW'}
        </p>
        {currentCampaign && (
          <p className="text-sm font-semibold text-zinc-200 mt-0.5">{currentCampaign.name}</p>
        )}
        {currentUnit && (
          <p className="text-xs text-emerald-500">{currentUnit.name}</p>
        )}
      </div>

      <div className="px-4 pt-6 space-y-8 max-w-sm mx-auto">

        {/* Campaign selector (only when multiple) */}
        {!autoCampaign && campaigns.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Campanha</p>
            <div className="space-y-2">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCampaignChange(c.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    campaignId === c.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unit selector (only when multiple) */}
        {!autoUnit && units.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Unidade</p>
            <div className="space-y-2">
              {units.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnitId(u.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    unitId === u.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {formReady && (
          <>
            {/* Group size stepper */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                Quantas pessoas?
              </p>
              <div className="flex items-center justify-center gap-6 bg-zinc-900 rounded-2xl border border-zinc-800 py-5">
                <button
                  type="button"
                  onClick={() => setGroupSize((v) => Math.max(1, v - 1))}
                  className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-2xl font-bold flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Diminuir"
                >
                  −
                </button>
                <span className="text-5xl font-bold text-zinc-50 w-16 text-center tabular-nums">
                  {groupSize}
                </span>
                <button
                  type="button"
                  onClick={() => setGroupSize((v) => Math.min(50, v + 1))}
                  className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-2xl font-bold flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
            </div>

            {/* Audience profile */}
            {audienceProfiles.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Perfil do grupo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {audienceProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProfileId(profileId === p.id ? '' : p.id)}
                      className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors text-center ${
                        profileId === p.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Converted: SIM / NÃO */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                O grupo entrou?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConverted(true);
                    setLossReasonId('');
                    setIdentifiedCompetitor(null);
                    setCompetitorId('');
                  }}
                  className={`py-5 rounded-2xl border text-lg font-bold transition-colors ${
                    converted === true
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConverted(false);
                    setInterestId('');
                  }}
                  className={`py-5 rounded-2xl border text-lg font-bold transition-colors ${
                    converted === false
                      ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  NÃO
                </button>
              </div>
            </div>

            {/* Converted = SIM → Interest */}
            {converted === true && interests.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Principal interesse
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {interests.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setInterestId(interestId === i.id ? '' : i.id)}
                      className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors text-center ${
                        interestId === i.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {i.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Converted = NÃO → Loss reason */}
            {converted === false && lossReasons.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Principal motivo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {lossReasons.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setLossReasonId(lossReasonId === r.id ? '' : r.id)}
                      className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors text-center ${
                        lossReasonId === r.id
                          ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Converted = NÃO → Identified competitor? */}
            {converted === false && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Sabe para onde o grupo foi?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIdentifiedCompetitor(true)}
                    className={`py-4 rounded-xl border text-sm font-bold transition-colors ${
                      identifiedCompetitor === true
                        ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    SIM
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIdentifiedCompetitor(false); setCompetitorId(''); }}
                    className={`py-4 rounded-xl border text-sm font-bold transition-colors ${
                      identifiedCompetitor === false
                        ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    NÃO
                  </button>
                </div>
              </div>
            )}

            {/* Competitor selection */}
            {converted === false && identifiedCompetitor === true && competitors.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Qual estabelecimento?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {competitors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCompetitorId(competitorId === c.id ? '' : c.id)}
                      className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors text-center ${
                        competitorId === c.id
                          ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                Observação <span className="normal-case font-normal">(opcional)</span>
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Observações opcionais..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <p className="text-xs text-zinc-600 mt-1 text-right">{notes.length}/300</p>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || converted === null || !campaignId || !unitId}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-lg py-5 rounded-2xl transition-colors active:scale-[.98]"
              >
                {isPending ? 'Salvando...' : 'SALVAR ABORDAGEM'}
              </button>
              <p className="text-xs text-zinc-600 text-center mt-3">{hostessName}</p>
            </div>
          </>
        )}

        {!formReady && campaigns.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-sm">Nenhuma campanha ativa disponível para sua unidade.</p>
            <p className="text-xs mt-2 text-zinc-600">Contate o administrador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
