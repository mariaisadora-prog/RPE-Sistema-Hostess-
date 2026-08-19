'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HourlyData {
  hour: number;
  approaches: number;
  converted_people: number;
}

export default function HourlyChart({ data }: { data: HourlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
        Nenhum dado encontrado para o período
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    hora: `${String(d.hour).padStart(2, '0')}h`,
  }));

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="approaches" name="Abordagens" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
