import { describe, it, expect } from 'vitest';

// ── Helpers matching production logic ─────────────────────────────────────────

interface ApproachRow {
  group_size: number;
  people_entered: number;
  people_rejected: number;
  unit_id: string;
  loss_reason_id?: string | null;
  loss_reason_name?: string | null;
}

function makeRow(opts: {
  group_size: number;
  outcome: 'entered' | 'rejected' | 'partial';
  people_entered?: number;
  unit_id?: string;
  loss_reason_id?: string | null;
  loss_reason_name?: string | null;
}): ApproachRow {
  const pe = opts.outcome === 'entered'
    ? opts.group_size
    : opts.outcome === 'rejected'
      ? 0
      : (opts.people_entered ?? Math.floor(opts.group_size / 2));
  return {
    group_size: opts.group_size,
    people_entered: pe,
    people_rejected: opts.group_size - pe,
    unit_id: opts.unit_id ?? 'A',
    loss_reason_id: opts.loss_reason_id ?? null,
    loss_reason_name: opts.loss_reason_name ?? null,
  };
}

function computeMetrics(rows: ApproachRow[]) {
  const totalPeople = rows.reduce((s, r) => s + r.group_size, 0);
  const convertedPeople = rows.reduce((s, r) => s + r.people_entered, 0);
  const rejectedPeople = rows.reduce((s, r) => s + r.people_rejected, 0);
  const peopleConversionRate = totalPeople > 0 ? (convertedPeople / totalPeople) * 100 : 0;
  return { totalPeople, convertedPeople, rejectedPeople, peopleConversionRate };
}

function computeLossReasonPeople(rows: ApproachRow[]) {
  const map = new Map<string, { name: string; people: number }>();
  for (const row of rows) {
    if (row.people_rejected > 0 && row.loss_reason_id) {
      const name = row.loss_reason_name ?? 'Desconhecido';
      const cur = map.get(row.loss_reason_id) ?? { name, people: 0 };
      cur.people += row.people_rejected;
      map.set(row.loss_reason_id, cur);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.people - a.people);
}

// ── Spec §85: PESSOAS vs GRUPOS ───────────────────────────────────────────────
describe('Regra central: PESSOAS, não grupos (Spec §85)', () => {
  it('3 grupos com tamanhos variados → abordagens = soma de pessoas', () => {
    const rows = [
      makeRow({ group_size: 2, outcome: 'entered' }),
      makeRow({ group_size: 5, outcome: 'rejected', loss_reason_id: 'r1', loss_reason_name: 'Preço' }),
      makeRow({ group_size: 3, outcome: 'entered' }),
    ];
    const m = computeMetrics(rows);
    expect(m.totalPeople).toBe(10);    // spec: "Abordagens = 10, não 3"
    expect(m.convertedPeople).toBe(5);
    expect(m.rejectedPeople).toBe(5);
    expect(m.peopleConversionRate).toBeCloseTo(50, 1);
  });
});

// ── Spec §18-19: CONVERSÃO PARCIAL ────────────────────────────────────────────
describe('Conversão parcial (Spec §18-19)', () => {
  it('6 pessoas, 4 entraram, 2 rejeitadas → correto', () => {
    const row = makeRow({ group_size: 6, outcome: 'partial', people_entered: 4 });
    expect(row.people_entered).toBe(4);
    expect(row.people_rejected).toBe(2);
    expect(row.people_entered + row.people_rejected).toBe(row.group_size);
  });

  it('people_entered + people_rejected = group_size em todos os cenários', () => {
    const cases = [
      makeRow({ group_size: 5, outcome: 'entered' }),
      makeRow({ group_size: 5, outcome: 'rejected' }),
      makeRow({ group_size: 6, outcome: 'partial', people_entered: 3 }),
      makeRow({ group_size: 10, outcome: 'partial', people_entered: 1 }),
    ];
    for (const r of cases) {
      expect(r.people_entered + r.people_rejected).toBe(r.group_size);
    }
  });

  it('Dashboard consolida corretamente com entrada parcial', () => {
    const rows = [
      makeRow({ group_size: 4, outcome: 'partial', people_entered: 1 }),
      makeRow({ group_size: 3, outcome: 'entered' }),
      makeRow({ group_size: 2, outcome: 'rejected' }),
    ];
    const m = computeMetrics(rows);
    expect(m.totalPeople).toBe(9);
    expect(m.convertedPeople).toBe(4);   // 1 + 3 + 0
    expect(m.rejectedPeople).toBe(5);    // 3 + 0 + 2
    expect(m.convertedPeople + m.rejectedPeople).toBe(m.totalPeople);
  });
});

// ── Spec §87: TESTE DE CONVERSÃO ──────────────────────────────────────────────
describe('Consistência das taxas (Spec §87)', () => {
  it('523 conversões + 324 rejeições = 847 abordagens', () => {
    const rows = [
      makeRow({ group_size: 523, outcome: 'entered' }),
      makeRow({ group_size: 324, outcome: 'rejected' }),
    ];
    const m = computeMetrics(rows);
    expect(m.totalPeople).toBe(847);
    expect(m.convertedPeople).toBe(523);
    expect(m.rejectedPeople).toBe(324);
    expect(m.peopleConversionRate).toBeCloseTo(61.7, 0);
  });
});

// ── Spec §47: MOTIVO PONDERADO POR PESSOAS ────────────────────────────────────
describe('Motivo de rejeição ponderado por pessoas (Spec §47)', () => {
  it('Tempo de espera ganha de Preço quando mais pessoas foram afetadas', () => {
    const rows = [
      makeRow({ group_size: 2, outcome: 'rejected', loss_reason_id: 'preco', loss_reason_name: 'Preço' }),
      makeRow({ group_size: 8, outcome: 'rejected', loss_reason_id: 'tempo', loss_reason_name: 'Tempo de espera' }),
      makeRow({ group_size: 2, outcome: 'rejected', loss_reason_id: 'preco', loss_reason_name: 'Preço' }),
    ];
    const sorted = computeLossReasonPeople(rows);
    expect(sorted[0].name).toBe('Tempo de espera'); // 8 pessoas
    expect(sorted[0].people).toBe(8);
    expect(sorted[1].name).toBe('Preço');            // 4 pessoas (2+2)
    expect(sorted[1].people).toBe(4);
  });
});

// ── Spec §86: ISOLAMENTO POR UNIDADE ─────────────────────────────────────────
describe('Isolamento por unidade (Spec §86)', () => {
  it('Mercearia=300, BamBam=220, Mamma=280 → consolidado=800', () => {
    const rows = [
      makeRow({ group_size: 300, outcome: 'entered', unit_id: 'mercearia' }),
      makeRow({ group_size: 220, outcome: 'entered', unit_id: 'bam-bam' }),
      makeRow({ group_size: 280, outcome: 'entered', unit_id: 'mamma' }),
    ];
    const total = computeMetrics(rows);
    expect(total.totalPeople).toBe(800);

    const mercearia = computeMetrics(rows.filter((r) => r.unit_id === 'mercearia'));
    expect(mercearia.totalPeople).toBe(300);

    const bamBam = computeMetrics(rows.filter((r) => r.unit_id === 'bam-bam'));
    expect(bamBam.totalPeople).toBe(220);
  });

  it('Soma das unidades equals total geral', () => {
    const rows = [
      makeRow({ group_size: 50, outcome: 'entered', unit_id: 'A' }),
      makeRow({ group_size: 30, outcome: 'rejected', unit_id: 'B' }),
      makeRow({ group_size: 20, outcome: 'partial', people_entered: 10, unit_id: 'A' }),
    ];
    const total = computeMetrics(rows).totalPeople;
    const sumUnits = ['A', 'B'].reduce(
      (s, uid) => s + computeMetrics(rows.filter((r) => r.unit_id === uid)).totalPeople,
      0
    );
    expect(total).toBe(sumUnits);
  });
});

// ── Spec §63: NÃO MÉDIA SIMPLES DE TAXAS ─────────────────────────────────────
describe('Taxa consolidada não é média simples (Spec §63)', () => {
  it('50 e 9 conversões calculado corretamente sobre 110 abordagens', () => {
    const rows = [
      makeRow({ group_size: 100, outcome: 'partial', people_entered: 50 }),
      makeRow({ group_size: 10, outcome: 'partial', people_entered: 9 }),
    ];
    const m = computeMetrics(rows);
    expect(m.totalPeople).toBe(110);
    expect(m.convertedPeople).toBe(59);
    expect(m.peopleConversionRate).toBeCloseTo(53.6, 0);
  });
});

// ── group_size validation ─────────────────────────────────────────────────────
describe('Validação de group_size', () => {
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
