'use client';

import { useState, useTransition } from 'react';
import { parseCSVAction, importRowsAction } from './actions';
import type { ParsedRow } from './actions';

export default function ImportarForm() {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [parseError, setParseError] = useState('');
  const [isPending, startTransition] = useTransition();

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string ?? '');
    reader.readAsText(file, 'UTF-8');
  }

  function handlePreview() {
    if (!csvText.trim()) {
      setParseError('Nenhum arquivo selecionado ou conteúdo vazio.');
      return;
    }
    setParseError('');
    startTransition(async () => {
      const parsed = await parseCSVAction(csvText);
      setRows(parsed);
      setStep('preview');
    });
  }

  function handleImport() {
    if (!campaignId) {
      setParseError('Selecione uma campanha antes de importar.');
      return;
    }
    startTransition(async () => {
      const res = await importRowsAction(rows, campaignId);
      setResult(res);
      setStep('done');
    });
  }

  if (step === 'done' && result) {
    return (
      <div className="max-w-lg">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-zinc-50 mb-2">Importação concluída</h2>
          <p className="text-zinc-400 text-sm mb-6">
            <span className="text-emerald-400 font-semibold">{result.imported} registros importados</span>
            {result.errors > 0 && (
              <> · <span className="text-red-400">{result.errors} com erro</span></>
            )}
          </p>
          <button
            onClick={() => { setStep('upload'); setCsvText(''); setRows([]); setResult(null); }}
            className="bg-emerald-500 text-black font-semibold px-6 py-2 rounded-lg text-sm hover:bg-emerald-400 transition-colors"
          >
            Nova importação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Step 1: Upload */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-base font-semibold text-zinc-50 mb-4">1. Selecione o arquivo CSV</h2>
        <p className="text-xs text-zinc-500 mb-4">
          O arquivo deve conter as colunas: <code className="bg-zinc-800 px-1 rounded">timestamp</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">casa</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">hostess</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">grupo</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">perfil</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">converteu</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">interesse</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">motivo</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">concorrente</code>,{' '}
          <code className="bg-zinc-800 px-1 rounded">observacao</code>
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
        />
        {csvText && (
          <p className="text-xs text-emerald-400 mt-2">
            Arquivo carregado ({csvText.split('\n').length - 1} linhas encontradas)
          </p>
        )}
        {parseError && (
          <p className="text-xs text-red-400 mt-2">{parseError}</p>
        )}
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPending || !csvText}
          className="mt-4 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Processando...' : 'Pré-visualizar'}
        </button>
      </div>

      {/* Step 2: Preview */}
      {step === 'preview' && rows.length > 0 && (
        <>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-base font-semibold text-zinc-50 mb-1">2. Revisão</h2>
            <p className="text-sm text-zinc-400 mb-4">
              <span className="text-emerald-400 font-semibold">{validRows.length} válidos</span>
              {invalidRows.length > 0 && (
                <> · <span className="text-red-400 font-semibold">{invalidRows.length} com erro</span></>
              )}
            </p>

            {invalidRows.length > 0 && (
              <div className="bg-red-950 border border-red-900 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                  Linhas com erro (não serão importadas)
                </p>
                <ul className="space-y-1">
                  {invalidRows.slice(0, 10).map((r) => (
                    <li key={r.rowIndex} className="text-xs text-red-300">
                      Linha {r.rowIndex}: {r.errors.join(', ')}
                    </li>
                  ))}
                  {invalidRows.length > 10 && (
                    <li className="text-xs text-red-500">... e mais {invalidRows.length - 10} erros</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="py-2 pr-3">Linha</th>
                    <th className="py-2 pr-3">Unidade</th>
                    <th className="py-2 pr-3">Hostess</th>
                    <th className="py-2 pr-3">Grupo</th>
                    <th className="py-2 pr-3">Entrou</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r) => (
                    <tr key={r.rowIndex} className={`border-b border-zinc-800 ${!r.valid ? 'opacity-40' : ''}`}>
                      <td className="py-2 pr-3 text-zinc-500">{r.rowIndex}</td>
                      <td className="py-2 pr-3 text-zinc-300">{r.unitName ?? '—'}</td>
                      <td className="py-2 pr-3 text-zinc-300">{r.hostessName ?? '—'}</td>
                      <td className="py-2 pr-3 text-zinc-300">{r.groupSize ?? '—'}</td>
                      <td className="py-2 pr-3">
                        {r.converted === true ? (
                          <span className="text-emerald-400">Sim</span>
                        ) : r.converted === false ? (
                          <span className="text-zinc-400">Não</span>
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {r.valid ? (
                          <span className="text-emerald-500">✓</span>
                        ) : (
                          <span className="text-red-400" title={r.errors.join(', ')}>✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-xs text-zinc-600 mt-2">
                  Mostrando 20 de {rows.length} linhas
                </p>
              )}
            </div>
          </div>

          {/* Campaign selector + import button */}
          {validRows.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-base font-semibold text-zinc-50 mb-4">3. Vincular à campanha</h2>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wide">
                    Campanha de destino *
                  </label>
                  <input
                    type="text"
                    placeholder="Cole o UUID da campanha aqui"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    Encontre o UUID em Admin → Campanhas → editar campanha
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isPending || !campaignId}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-sm font-bold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {isPending ? 'Importando...' : `Importar ${validRows.length} registros`}
                </button>
              </div>
              {parseError && (
                <p className="text-xs text-red-400 mt-2">{parseError}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
