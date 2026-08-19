// ============================================================
// RPE FLOW — Database & Application Types
// ============================================================

// --- Enums ---
export type UserRole = 'admin' | 'manager' | 'hostess';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'CAMPAIGN_UPDATE'
  | 'USER_UPDATE';

// --- Database Row Types ---

export interface Unit {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUnit {
  id: string;
  user_id: string;
  unit_id: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CampaignUnit {
  campaign_id: string;
  unit_id: string;
}

export interface AudienceProfile {
  id: string;
  campaign_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface CampaignInterest {
  id: string;
  campaign_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface LossReason {
  id: string;
  campaign_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Competitor {
  id: string;
  campaign_id: string;
  unit_id: string | null;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Approach {
  id: string;
  campaign_id: string;
  unit_id: string;
  hostess_id: string;
  group_size: number;
  audience_profile_id: string | null;
  converted: boolean;
  interest_id: string | null;
  loss_reason_id: string | null;
  competitor_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface AuditLog {
  id: string;
  record_id: string | null;
  table_name: string;
  user_id: string | null;
  action: AuditAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

// --- Extended types with joins ---

export interface ApproachWithRelations extends Approach {
  campaign?: Campaign;
  unit?: Unit;
  hostess?: Profile;
  audience_profile?: AudienceProfile;
  interest?: CampaignInterest;
  loss_reason?: LossReason;
  competitor?: Competitor;
}

export interface CampaignWithUnits extends Campaign {
  campaign_units?: (CampaignUnit & { unit?: Unit })[];
}

export interface ProfileWithUnits extends Profile {
  user_units?: (UserUnit & { unit?: Unit })[];
}

// --- Dashboard / Analytics types ---

export interface DashboardSummary {
  total_approaches: number;
  total_people: number;
  converted_groups: number;
  converted_people: number;
  not_converted_groups: number;
  not_converted_people: number;
  group_conversion_rate: number;
  people_conversion_rate: number;
}

export interface HourlyPerformance {
  hour: number;
  approaches: number;
  people: number;
  converted_people: number;
  conversion_rate: number;
}

export interface HostessPerformance {
  hostess_id: string;
  hostess_name: string;
  approaches: number;
  people_approached: number;
  people_converted: number;
  group_conversion_rate: number;
  people_conversion_rate: number;
}

export interface LossReasonPerformance {
  loss_reason_id: string;
  loss_reason_name: string;
  groups: number;
  people: number;
  percentage: number;
}

export interface AudiencePerformance {
  audience_profile_id: string;
  audience_profile_name: string;
  groups: number;
  people: number;
  converted_groups: number;
  converted_people: number;
  group_conversion_rate: number;
  people_conversion_rate: number;
  percentage: number;
}

export interface CompetitorPerformance {
  competitor_id: string;
  competitor_name: string;
  groups: number;
  people: number;
  percentage: number;
}

export interface InterestPerformance {
  interest_id: string;
  interest_name: string;
  groups: number;
  people: number;
  percentage: number;
}

// --- Filter types ---

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  campaignId?: string;
  unitId?: string;
  hostessId?: string;
  audienceProfileId?: string;
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'thisWeek'
  | 'thisMonth'
  | 'custom';

// --- Form types ---

export interface ApproachFormData {
  campaign_id: string;
  unit_id: string;
  group_size: number;
  audience_profile_id: string | null;
  converted: boolean;
  interest_id: string | null;
  loss_reason_id: string | null;
  identified_competitor: boolean | null;
  competitor_id: string | null;
  notes: string;
}

// --- Import types ---

export interface ImportRow {
  timestamp?: string;
  casa?: string;
  hostess?: string;
  grupo?: string;
  perfil?: string;
  converteu?: string;
  interesse?: string;
  motivo?: string;
  concorrente?: string;
  observacao?: string;
}

export interface ImportResult {
  valid: number;
  errors: { row: number; message: string }[];
  preview: ImportRow[];
}
