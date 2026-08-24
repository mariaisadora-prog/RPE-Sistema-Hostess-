import { z } from 'zod';

// ============================================================
// Approach form validation schema
// ============================================================
export const approachSchema = z.object({
  campaign_id: z.string().uuid('Campanha inválida'),
  unit_id: z.string().uuid('Unidade inválida'),
  group_size: z
    .number()
    .int('Deve ser um número inteiro')
    .min(1, 'Mínimo 1 pessoa')
    .max(50, 'Máximo 50 pessoas'),
  audience_profile_id: z.string().uuid().nullable().optional(),
  outcome: z.enum(['entered', 'rejected', 'partial'], { error: 'Resultado inválido' }),
  people_entered: z.number().int().min(0),
  people_rejected: z.number().int().min(0),
  specific_demand: z.boolean().optional().default(false),
  requested_item_id: z.string().uuid().nullable().optional(),
  requested_item_text: z.string().max(200).nullable().optional(),
  exists_on_menu: z.boolean().nullable().optional(),
  interest_id: z.string().uuid().nullable().optional(),
  loss_reason_id: z.string().uuid().nullable().optional(),
  competitor_id: z.string().uuid().nullable().optional(),
  notes: z
    .string()
    .max(300, 'Observação deve ter no máximo 300 caracteres')
    .optional()
    .default(''),
}).refine(
  (data) => data.people_entered + data.people_rejected === data.group_size,
  { message: 'Pessoas que entraram + rejeitadas deve igual ao tamanho do grupo', path: ['people_entered'] }
).refine(
  (data) => {
    if (data.outcome === 'entered') return data.people_entered === data.group_size;
    return true;
  },
  { message: 'Se entrou, todas as pessoas devem ter entrado', path: ['people_entered'] }
).refine(
  (data) => {
    if (data.outcome === 'rejected') return data.people_rejected === data.group_size;
    return true;
  },
  { message: 'Se não entrou, nenhuma pessoa deve ter entrado', path: ['people_rejected'] }
).refine(
  (data) => {
    if (data.outcome === 'partial') return data.people_entered > 0 && data.people_rejected > 0;
    return true;
  },
  { message: 'Parcial requer ao menos uma entrada e uma rejeição', path: ['people_entered'] }
);

export type ApproachInput = z.infer<typeof approachSchema>;

// ============================================================
// Campaign validation
// ============================================================
export const campaignSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(500).optional().default(''),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de fim é obrigatória'),
  active: z.boolean().default(true),
  unit_ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma unidade'),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Data de fim deve ser igual ou posterior à data de início', path: ['end_date'] }
);

export type CampaignInput = z.infer<typeof campaignSchema>;

// ============================================================
// User validation
// ============================================================
export const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'manager', 'hostess']),
  active: z.boolean().default(true),
  unit_ids: z.array(z.string().uuid()).default([]),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
});

export type UserInput = z.infer<typeof userSchema>;

// ============================================================
// Unit validation
// ============================================================
export const unitSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  slug: z.string().min(1, 'Slug é obrigatório').max(200),
  active: z.boolean().default(true),
});

export type UnitInput = z.infer<typeof unitSchema>;

// ============================================================
// Auxiliary item validation (profiles, interests, reasons, competitors)
// ============================================================
export const auxiliaryItemSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export type AuxiliaryItemInput = z.infer<typeof auxiliaryItemSchema>;
