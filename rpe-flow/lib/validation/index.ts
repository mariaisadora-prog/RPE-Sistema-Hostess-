import { z } from 'zod';

// ============================================================
// Approach form validation schema
// ============================================================
export const approachSchema = z.object({
  campaign_id: z.string().uuid('Campanha inválida'),
  unit_id: z.string().uuid('Unidade inválida'),
  group_size: z
    .number({ required_error: 'Informe a quantidade de pessoas' })
    .int('Deve ser um número inteiro')
    .min(1, 'Mínimo 1 pessoa')
    .max(50, 'Máximo 50 pessoas'),
  audience_profile_id: z.string().uuid().nullable().optional(),
  converted: z.boolean({ required_error: 'Informe se o grupo entrou' }),
  interest_id: z.string().uuid().nullable().optional(),
  loss_reason_id: z.string().uuid().nullable().optional(),
  competitor_id: z.string().uuid().nullable().optional(),
  notes: z
    .string()
    .max(300, 'Observação deve ter no máximo 300 caracteres')
    .optional()
    .default(''),
}).refine(
  (data) => {
    // If converted, interest can be provided but loss_reason/competitor should not
    if (data.converted) {
      return !data.loss_reason_id;
    }
    return true;
  },
  { message: 'Motivo de perda não se aplica quando convertido', path: ['loss_reason_id'] }
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
  role: z.enum(['admin', 'manager', 'hostess'], {
    required_error: 'Selecione o perfil',
  }),
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
