import { describe, it, expect } from 'vitest';

// ── Inline calculation helpers (same logic as production) ──────────────
// These mirror the official formulas from the spec (section 29).

function calculateGroupConversionRate(converted: number, total: number): number {
  if (total === 0) return 0;
  return (converted / total) * 100;
}

function calculatePeopleConversionRate(convertedPeople: number, totalPeople: number): number {
  if (totalPeople === 0) return 0;
  return (convertedPeople / totalPeople) * 100;
}

interface ApproachRow {
  group_size: number;
  converted: boolean;
  unit_id: string;
  loss_reason_id?: string | null;
}

function computeMetrics(rows: ApproachRow[]) {
  const totalApproaches = rows.length;
  const totalPeople = rows.reduce((sum, r) => sum + r.group_size, 0);
  const convertedGroups = rows.filter((r) => r.converted).length;
  const convertedPeople = rows.filter((r) => r.converted).reduce((sum, r) => sum + r.group_size, 0);
  const notConvertedGroups = totalApproaches - convertedGroups;
  const notConvertedPeople = totalPeople - convertedPeople;
  const groupConversionRate = calculateGroupConversionRate(convertedGroups, totalApproaches);
  const peopleConversionRate = calculatePeopleConversionRate(convertedPeople, totalPeople);
  return {
    totalApproaches,
    totalPeople,
    convertedGroups,
    convertedPeople,
    notConvertedGroups,
    notConvertedPeople,
    groupConversionRate,
    peopleConversionRate,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('Fórmulas de Conversão (Spec §29)', () => {
  it('Converte 70% dos grupos quando 7 de 10 entraram', () => {
    const rows: ApproachRow[] = [
      ...Array(7).fill(null).map(() => ({ group_size: 1, converted: true, unit_id: 'A' })),
      ...Array(3).fill(null).map(() => ({ group_size: 1, converted: false, unit_id: 'A' })),
    ];
    const m = computeMetrics(rows);
    expect(m.totalApproaches).toBe(10);
    expect(m.convertedGroups).toBe(7);
    expect(m.groupConversionRate).toBeCloseTo(70, 1);
  });

  it('Converte 50% das pessoas quando 15 de 30 entraram', () => {
    const rows: ApproachRow[] = [
      { group_size: 15, converted: true, unit_id: 'A' },
      { group_size: 15, converted: false, unit_id: 'A' },
    ];
    const m = computeMetrics(rows);
    expect(m.totalPeople).toBe(30);
    expect(m.convertedPeople).toBe(15);
    expect(m.peopleConversionRate).toBeCloseTo(50, 1);
  });

  it('Retorna 0% quando não há abordagens (sem divisão por zero)', () => {
    const m = computeMetrics([]);
    expect(m.totalApproaches).toBe(0);
    expect(m.groupConversionRate).toBe(0);
    expect(m.peopleConversionRate).toBe(0);
  });

  it('Grupos e pessoas são métricas independentes', () => {
    // 2 grupos, 1 entrou → 50% grupos
    // 3 pessoas no grupo que não entrou, 2 no que entrou → 2/5 = 40% pessoas
    const rows: ApproachRow[] = [
      { group_size: 2, converted: true, unit_id: 'A' },
      { group_size: 3, converted: false, unit_id: 'A' },
    ];
    const m = computeMetrics(rows);
    expect(m.groupConversionRate).toBeCloseTo(50, 1);
    expect(m.peopleConversionRate).toBeCloseTo(40, 1);
  });

  it('100% de conversão quando todos os grupos entraram', () => {
    const rows: ApproachRow[] = [
      { group_size: 4, converted: true, unit_id: 'A' },
      { group_size: 2, converted: true, unit_id: 'A' },
    ];
    const m = computeMetrics(rows);
    expect(m.groupConversionRate).toBe(100);
    expect(m.peopleConversionRate).toBe(100);
    expect(m.notConvertedGroups).toBe(0);
  });
});

describe('Isolamento por unidade (Spec §66)', () => {
  it('Filtrando por unidade A não inclui dados da unidade B', () => {
    const allRows: ApproachRow[] = [
      { group_size: 3, converted: true, unit_id: 'A' },
      { group_size: 5, converted: false, unit_id: 'A' },
      { group_size: 10, converted: true, unit_id: 'B' },
      { group_size: 20, converted: false, unit_id: 'B' },
    ];
    const unitA = allRows.filter((r) => r.unit_id === 'A');
    const mA = computeMetrics(unitA);
    expect(mA.totalApproaches).toBe(2);
    expect(mA.totalPeople).toBe(8);
    expect(mA.convertedPeople).toBe(3);
  });
});

describe('Proteção contra ranking enganoso (Spec §35)', () => {
  it('Baixa amostra é identificável (< 10 abordagens)', () => {
    const MIN_SAMPLE = 10;
    const rows: ApproachRow[] = [
      { group_size: 2, converted: true, unit_id: 'A' },
      { group_size: 2, converted: true, unit_id: 'A' },
    ];
    const m = computeMetrics(rows);
    const isLowSample = m.totalApproaches < MIN_SAMPLE;
    expect(m.groupConversionRate).toBe(100);
    expect(isLowSample).toBe(true);
  });

  it('Alta amostra é confiável (>= 10 abordagens)', () => {
    const MIN_SAMPLE = 10;
    const rows: ApproachRow[] = Array(12).fill(null).map((_, i) => ({
      group_size: 2,
      converted: i < 8,
      unit_id: 'A',
    }));
    const m = computeMetrics(rows);
    const isLowSample = m.totalApproaches < MIN_SAMPLE;
    expect(isLowSample).toBe(false);
    expect(m.groupConversionRate).toBeCloseTo(66.7, 0);
  });
});

describe('Motivos de perda', () => {
  it('Ordena motivos por quantidade de grupos (desc)', () => {
    const entries = [
      { name: 'Preço', count: 18 },
      { name: 'Outro restaurante', count: 11 },
      { name: 'Tempo de espera', count: 8 },
    ];
    const sorted = [...entries].sort((a, b) => b.count - a.count);
    expect(sorted[0].name).toBe('Preço');
    expect(sorted[1].name).toBe('Outro restaurante');
  });
});

describe('Validação de group_size (Spec §14)', () => {
  it('Aceita valores entre 1 e 50', () => {
    const valid = (v: number) => v >= 1 && v <= 50 && Number.isInteger(v);
    expect(valid(1)).toBe(true);
    expect(valid(50)).toBe(true);
    expect(valid(25)).toBe(true);
  });

  it('Rejeita valores fora do intervalo', () => {
    const valid = (v: number) => v >= 1 && v <= 50 && Number.isInteger(v);
    expect(valid(0)).toBe(false);
    expect(valid(51)).toBe(false);
    expect(valid(-1)).toBe(false);
  });
});
