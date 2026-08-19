'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const PRESETS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: '7 dias' },
  { value: 'thisMonth', label: 'Este mês' },
];

export default function DashboardFilters({ activePreset }: { activePreset: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', preset);
    params.delete('startDate');
    params.delete('endDate');
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => handlePreset(p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activePreset === p.value
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-zinc-700 border border-zinc-200 hover:border-emerald-500'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
