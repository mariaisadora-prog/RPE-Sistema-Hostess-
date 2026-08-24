-- ============================================================
-- RPE FLOW — Migration 006: Schema Reconciliation
-- ============================================================
-- The DB has partial schemas from a non-standard initial setup.
-- This migration brings all tables to the spec-defined schema
-- using ALTER TABLE ... ADD COLUMN IF NOT EXISTS (idempotent).

-- ============================================================
-- 1. FIX profiles TABLE
-- ============================================================
-- Add missing columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill: in this DB, profiles.id = auth.users.id
UPDATE profiles p SET
  auth_user_id = p.id,
  name         = COALESCE(p.full_name, 'Usuário'),
  email        = (SELECT au.email FROM auth.users au WHERE au.id = p.id),
  updated_at   = p.created_at
WHERE p.auth_user_id IS NULL;

-- Make newly populated columns NOT NULL
ALTER TABLE profiles ALTER COLUMN auth_user_id SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN name SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Set first user as admin
UPDATE profiles SET role = 'admin' WHERE auth_user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);

-- ============================================================
-- 2. FIX units TABLE
-- ============================================================
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill slug from name
UPDATE units SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

ALTER TABLE units ADD CONSTRAINT IF NOT EXISTS units_slug_unique UNIQUE (slug);
ALTER TABLE units ALTER COLUMN slug SET NOT NULL;

-- ============================================================
-- 3. FIX campaigns TABLE
-- ============================================================
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 4. FIX approaches TABLE (add remaining migration-001 columns)
-- ============================================================
ALTER TABLE approaches
  ADD COLUMN IF NOT EXISTS converted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audience_profile_id UUID,
  ADD COLUMN IF NOT EXISTS interest_id UUID,
  ADD COLUMN IF NOT EXISTS loss_reason_id UUID,
  ADD COLUMN IF NOT EXISTS competitor_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add missing migration-005 columns (idempotent)
ALTER TABLE approaches
  ADD COLUMN IF NOT EXISTS people_rejected INTEGER,
  ADD COLUMN IF NOT EXISTS specific_demand BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_item_id UUID,
  ADD COLUMN IF NOT EXISTS requested_item_text TEXT,
  ADD COLUMN IF NOT EXISTS exists_on_menu BOOLEAN;

-- Backfill converted from outcome (if any rows exist)
UPDATE approaches SET
  converted       = (outcome = 'entered'),
  people_rejected = COALESCE(people_rejected, group_size - COALESCE(people_entered, 0))
WHERE converted IS DISTINCT FROM (outcome = 'entered') OR people_rejected IS NULL;

-- Add constraints if they don't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approaches_outcome_check'
  ) THEN
    ALTER TABLE approaches ADD CONSTRAINT approaches_outcome_check
      CHECK (outcome IN ('entered', 'rejected', 'partial'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approaches_people_check'
  ) THEN
    ALTER TABLE approaches ADD CONSTRAINT approaches_people_check
      CHECK (people_entered + people_rejected = group_size);
  END IF;
END $$;

-- Recreate trigger (replaces any previous version)
CREATE OR REPLACE FUNCTION sync_approach_converted()
RETURNS TRIGGER AS $$
BEGIN
  NEW.converted := (NEW.outcome = 'entered');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approaches_sync_converted ON approaches;
CREATE TRIGGER approaches_sync_converted
  BEFORE INSERT OR UPDATE ON approaches
  FOR EACH ROW EXECUTE FUNCTION sync_approach_converted();

-- ============================================================
-- 5. FIX audience_profiles TABLE
-- ============================================================
ALTER TABLE audience_profiles
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 6. FIX campaign_interests TABLE
-- ============================================================
ALTER TABLE campaign_interests
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 7. FIX loss_reasons TABLE
-- ============================================================
ALTER TABLE loss_reasons
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 8. FIX competitors TABLE
-- ============================================================
ALTER TABLE competitors
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 9. FIX campaign_units TABLE
-- ============================================================
ALTER TABLE campaign_units
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 10. SEED: link units to initial campaign data
-- (Only if campaigns table is empty — idempotent)
-- ============================================================
-- Insert Oktoberfest 2026 campaign if not already present
INSERT INTO campaigns (id, name, description, start_date, end_date, active)
SELECT 'b1b2c3d4-0001-4000-8000-000000000001', 'Oktoberfest 2026',
       'Campanha Oktoberfest 2026 — ações comerciais nas unidades do Grupo RPE',
       '2026-10-01', '2026-10-31', true
WHERE NOT EXISTS (SELECT 1 FROM campaigns WHERE name = 'Oktoberfest 2026');

-- Link units (use actual unit IDs from DB)
INSERT INTO campaign_units (campaign_id, unit_id)
SELECT 'b1b2c3d4-0001-4000-8000-000000000001', u.id
FROM units u
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_units cu
  WHERE cu.campaign_id = 'b1b2c3d4-0001-4000-8000-000000000001'
    AND cu.unit_id = u.id
);

-- Audience profiles for Oktoberfest
INSERT INTO audience_profiles (campaign_id, name, sort_order) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Casal', 1),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Família', 2),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Amigos', 3),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Sozinho(a)', 4),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Grupo maior', 5),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Corporativo', 6),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Outro', 7),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Não identificado', 8)
ON CONFLICT DO NOTHING;

-- Campaign interests
INSERT INTO campaign_interests (campaign_id, name, sort_order) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Menu Oktoberfest', 1),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Chope', 2),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Música / ambiente', 3),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Cardápio normal', 4),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Localização', 5),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Evento Oktoberfest', 6),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Outro', 7),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Não identificado', 8)
ON CONFLICT DO NOTHING;

-- Loss reasons
INSERT INTO loss_reasons (campaign_id, name, sort_order) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Preço', 1),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Cardápio não interessou', 2),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Procurava outro tipo de comida', 3),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Tempo de espera', 4),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Restaurante cheio', 5),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Preferiu outro restaurante', 6),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Só estava passeando', 7),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Horário', 8),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Não quis informar', 9),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Outro', 10),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Não identificado', 11)
ON CONFLICT DO NOTHING;

-- Competitors (for Mercearia Campos unit)
INSERT INTO competitors (campaign_id, unit_id, name, sort_order)
SELECT 'b1b2c3d4-0001-4000-8000-000000000001', u.id, 'Baden Baden', 1
FROM units u WHERE u.name = 'Mercearia Campos' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO competitors (campaign_id, unit_id, name, sort_order)
SELECT 'b1b2c3d4-0001-4000-8000-000000000001', u.id, 'Esquina do Djalma', 2
FROM units u WHERE u.name = 'Mercearia Campos' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO competitors (campaign_id, unit_id, name, sort_order)
SELECT 'b1b2c3d4-0001-4000-8000-000000000001', u.id, 'Villa di Phoenix', 3
FROM units u WHERE u.name = 'Mercearia Campos' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO competitors (campaign_id, name, sort_order) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Outro', 4),
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Não identificado', 5)
ON CONFLICT DO NOTHING;

-- requested_items (idempotent — may already exist from migration 005)
INSERT INTO requested_items (name) VALUES
  ('Fondue'), ('Pizza'), ('Hambúrguer'), ('Massa'), ('Carne'),
  ('Comida alemã'), ('Chope'), ('Cerveja artesanal'), ('Drinks'),
  ('Sobremesa'), ('Prato executivo'), ('Vegetariano'), ('Outro')
ON CONFLICT DO NOTHING;
