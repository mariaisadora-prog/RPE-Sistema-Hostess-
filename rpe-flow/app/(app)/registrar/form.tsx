'use client';

import { useState, useTransition, useCallback } from 'react';
import { registrarAbordagemAction, getCampaignOptionsAction } from './actions';
import { formatTime } from '@/lib/utils';

type Outcome = 'entered' | 'rejected' | 'partial';
type ExistsOnMenu = 'yes' | 'no' | 'unknown';
type SpecificDemand = 'yes' | 'no' | 'unknown';

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
  requestedItems: Option[];
}

interface SuccessInfo {
  groupSize: number;
  outcome: Outcome;
  peopleEntered: number;
  unitName: string;
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
  requestedItems,
}: RegistrarFormProps) {
  const [campaignId, setCampaignId] = useState(autoCampaign?.id ?? '');
  const [unitId, setUnitId] = useState(autoUnit?.id ?? '');
  const [groupSize, setGroupSize] = useState(2);
  const [profileId, setProfileId] = useState('');

  // Outcome: ENTROU / NÃO ENTROU / PARCIAL
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [peopleEntered, setPeopleEntered] = useState(1);

  // Specific demand
  const [specificDemand, setSpecificDemand] = useState<SpecificDemand | null>(null);
  const [requestedItemId, setRequestedItemId] = useState('');
  const [existsOnMenu, setExistsOnMenu] = useState<ExistsOnMenu | null>(null);

  // Conversion interest (when entered)
  const [interestId, setInterestId] = useState('');

  // Rejection fields
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

  const handleCampaignChange = useCallback(async (id: string) => {
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
  }, []);

  function handleOutcomeChange(o: Outcome) {
    setOutcome(o);
    if (o === 'entered') {
      setLossReasonId('');
      setIdentifiedCompetitor(null);
      setCompetitorId('');
    } else {
      setInterestId('');
    }
    if (o !== 'partial') {
      setPeopleEntered(1);
    }
  }

  function resetForm() {
    setGroupSize(2);
    setProfileId('');
    setOutcome(null);
    setPeopleEntered(1);
    setSpecificDemand(null);
    setRequestedItemId('');
    setExistsOnMenu(null);
    setInterestId('');
    setLossReasonId('');
    setIdentifiedCompetitor(null);
    setCompetitorId('');
    setNotes('');
    setError(null);
    setSuccess(null);
  }

  function handleSubmit() {
    if (!campaignId || !unitId || outcome === null) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (outcome === 'partial' && (peopleEntered < 1 || peopleEntered >= groupSize)) {
      setError('Informe quantas pessoas entraram (ao menos 1 e menos que o total do grupo).');
      return;
    }
    setError(null);

    const pe = outcome === 'entered' ? groupSize : outcome === 'rejected' ? 0 : peopleEntered;

    const formData = new FormData();
    formData.set('campaign_id', campaignId);
    formData.set('unit_id', unitId);
    formData.set('group_size', String(groupSize));
    if (profileId) formData.set('audience_profile_id', profileId);
    formData.set('outcome', outcome);
    if (outcome === 'partial') formData.set('people_entered', String(pe));
    if (specificDemand !== null) formData.set('specific_demand', String(specificDemand === 'yes'));
    if (specificDemand === 'yes' && requestedItemId) formData.set('requested_item_id', requestedItemId);
    if (specificDemand === 'yes' && existsOnMenu !== null) {
      if (existsOnMenu === 'yes') formData.set('exists_on_menu', 'true');
      else if (existsOnMenu === 'no') formData.set('exists_on_menu', 'false');
    }
    if (outcome === 'entered' && interestId) formData.set('interest_id', interestId);
    if (outcome !== 'entered' && lossReasonId) formData.set('loss_reason_id', lossReasonId);
    if (outcome !== 'entered' && identifiedCompetitor && competitorId) formData.set('competitor_id', competitorId);
    if (notes) formData.set('notes', notes);

    startTransition(async () => {
      const result = await registrarAbordagemAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess({
          groupSize,
          outcome: outcome!,
          peopleEntered: pe,
          unitName: currentUnit?.name ?? '',
          time: formatTime(new Date().toISOString()),
        });
      }
    });
  }

  // ── Success screen ────────────────────────────────────────────
  if (success) {
    const outcomeLabel =
      success.outcome === 'entered'
        ? `${success.groupSize} ${success.groupSize === 1 ? 'pessoa entrou' : 'pessoas entraram'}`
        : success.outcome === 'rejected'
          ? 'Grupo não entrou'
          : `${success.peopleEntered} de ${success.groupSize} pessoas entraram`;

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${success.outcome === 'entered' ? 'bg-emerald-500/10' : success.outcome === 'partial' ? 'bg-yellow-500/10' : 'bg-zinc-800'}`}>
            {success.outcome === 'entered' ? (
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : success.outcome === 'partial' ? (
              <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-zinc-50 mb-2">Abordagem registrada!</h2>
          <div className="text-zinc-400 text-sm space-y-1 mb-8">
            <p className={success.outcome === 'entered' ? 'text-emerald-400' : success.outcome === 'partial' ? 'text-yellow-400' : 'text-zinc-400'}>
              {outcomeLabel}
            </p>
            {success.unitName && <p className="text-zinc-500">{success.unitName}</p>}
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

  const formReady = !!campaignId && !!unitId;
  const hasRejection = outcome === 'rejected' || outcome === 'partial';

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
                  onClick={() => {
                    const next = Math.max(1, groupSize - 1);
                    setGroupSize(next);
                    if (outcome === 'partial') setPeopleEntered(Math.min(peopleEntered, next - 1));
                  }}
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

            {/* Outcome: ENTROU / NÃO ENTROU / PARCIAL */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                O grupo entrou?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleOutcomeChange('entered')}
                  className={`py-5 rounded-2xl border text-sm font-bold transition-colors ${
                    outcome === 'entered'
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  ENTROU
                </button>
                <button
                  type="button"
                  onClick={() => handleOutcomeChange('rejected')}
                  className={`py-5 rounded-2xl border text-sm font-bold transition-colors ${
                    outcome === 'rejected'
                      ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  NÃO ENTROU
                </button>
                <button
                  type="button"
                  onClick={() => handleOutcomeChange('partial')}
                  className={`py-5 rounded-2xl border text-sm font-bold transition-colors ${
                    outcome === 'partial'
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  PARCIAL
                </button>
              </div>
            </div>

            {/* Partial: how many entered */}
            {outcome === 'partial' && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Quantas pessoas entraram?
                </p>
                <div className="flex items-center justify-center gap-6 bg-zinc-900 rounded-2xl border border-yellow-800/50 py-5">
                  <button
                    type="button"
                    onClick={() => setPeopleEntered((v) => Math.max(1, v - 1))}
                    className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-2xl font-bold flex items-center justify-center transition-colors active:scale-95"
                    aria-label="Diminuir"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-yellow-300 tabular-nums">{peopleEntered}</span>
                    <p className="text-xs text-zinc-500 mt-1">
                      {groupSize - peopleEntered} não {(groupSize - peopleEntered) === 1 ? 'entrou' : 'entraram'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPeopleEntered((v) => Math.min(groupSize - 1, v + 1))}
                    className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-2xl font-bold flex items-center justify-center transition-colors active:scale-95"
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Specific demand */}
            {outcome !== null && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  O cliente estava procurando algo específico?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['yes', 'no', 'unknown'] as SpecificDemand[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSpecificDemand(opt);
                        if (opt !== 'yes') { setRequestedItemId(''); setExistsOnMenu(null); }
                      }}
                      className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                        specificDemand === opt
                          ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {opt === 'yes' ? 'Sim' : opt === 'no' ? 'Não' : 'Não sabe'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Requested item selection */}
            {specificDemand === 'yes' && requestedItems.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  O que estava procurando?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {requestedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setRequestedItemId(requestedItemId === item.id ? '' : item.id);
                        setExistsOnMenu(null);
                      }}
                      className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors text-center ${
                        requestedItemId === item.id
                          ? 'bg-zinc-600 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exists on menu? */}
            {specificDemand === 'yes' && requestedItemId && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Este item existe no cardápio desta casa?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['yes', 'no', 'unknown'] as ExistsOnMenu[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExistsOnMenu(opt)}
                      className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                        existsOnMenu === opt
                          ? opt === 'yes'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : opt === 'no'
                              ? 'bg-red-950 border-red-800 text-red-400'
                              : 'bg-zinc-600 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {opt === 'yes' ? 'Sim' : opt === 'no' ? 'Não' : 'Não sei'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Entered → Interest */}
            {outcome === 'entered' && interests.length > 0 && (
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

            {/* Not entered / partial → Loss reason */}
            {hasRejection && lossReasons.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Principal motivo para não entrar
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

            {/* Not entered / partial → Identified competitor */}
            {hasRejection && (
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
            {hasRejection && identifiedCompetitor === true && competitors.length > 0 && (
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
                disabled={isPending || outcome === null || !campaignId || !unitId}
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
