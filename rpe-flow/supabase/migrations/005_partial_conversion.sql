-- ============================================================
-- RPE FLOW — Migration 005: Partial conversion + requested items
-- ============================================================
-- Adds outcome (entered/rejected/partial), people counts,
-- specific demand tracking, and global requested_items table.

-- ============================================================
-- 1. REQUESTED ITEMS (global, not campaign-scoped)
-- ============================================================
CREATE TABLE requested_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. NEW COLUMNS ON APPROACHES
-- ============================================================
ALTER TABLE approaches
  ADD COLUMN outcome TEXT,
  ADD COLUMN people_entered INTEGER,
  ADD COLUMN people_rejected INTEGER,
  ADD COLUMN specific_demand BOOLEAN,
  ADD COLUMN requested_item_id UUID REFERENCES requested_items(id),
  ADD COLUMN requested_item_text TEXT,
  ADD COLUMN exists_on_menu BOOLEAN;

-- ============================================================
-- 3. BACKFILL FROM EXISTING converted BOOLEAN
-- ============================================================
UPDATE approaches SET
  outcome        = CASE WHEN converted THEN 'entered' ELSE 'rejected' END,
  people_entered = CASE WHEN converted THEN group_size ELSE 0 END,
  people_rejected = CASE WHEN converted THEN 0 ELSE group_size END;

-- ============================================================
-- 4. MAKE CORE COLUMNS NON-NULLABLE
-- ============================================================
ALTER TABLE approaches
  ALTER COLUMN outcome SET NOT NULL,
  ALTER COLUMN people_entered SET NOT NULL,
  ALTER COLUMN people_rejected SET NOT NULL;

-- ============================================================
-- 5. ADD OUTCOME VALUE CONSTRAINT
-- ============================================================
ALTER TABLE approaches
  ADD CONSTRAINT approaches_outcome_check
    CHECK (outcome IN ('entered', 'rejected', 'partial'));

-- ============================================================
-- 6. ADD MATH INTEGRITY CONSTRAINT
-- people_entered + people_rejected must equal group_size
-- ============================================================
ALTER TABLE approaches
  ADD CONSTRAINT approaches_people_check
    CHECK (people_entered + people_rejected = group_size);

-- ============================================================
-- 7. TRIGGER: keep legacy `converted` column in sync
-- ============================================================
CREATE OR REPLACE FUNCTION sync_approach_converted()
RETURNS TRIGGER AS $$
BEGIN
  NEW.converted := (NEW.outcome = 'entered');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approaches_sync_converted
  BEFORE INSERT OR UPDATE ON approaches
  FOR EACH ROW EXECUTE FUNCTION sync_approach_converted();

-- ============================================================
-- 8. INDEX on new columns
-- ============================================================
CREATE INDEX idx_approaches_outcome         ON approaches(outcome)           WHERE deleted_at IS NULL;
CREATE INDEX idx_approaches_specific_demand ON approaches(specific_demand)   WHERE deleted_at IS NULL AND specific_demand = true;
CREATE INDEX idx_approaches_requested_item  ON approaches(requested_item_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. RLS for requested_items (public read, admin write)
-- ============================================================
ALTER TABLE requested_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read requested_items"
  ON requested_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage requested_items"
  ON requested_items FOR ALL
  TO authenticated USING (is_admin());

-- ============================================================
-- 10. SEED requested_items
-- ============================================================
INSERT INTO requested_items (name) VALUES
  ('Fondue'),
  ('Pizza'),
  ('Hambúrguer'),
  ('Massa'),
  ('Carne'),
  ('Comida alemã'),
  ('Chope'),
  ('Cerveja artesanal'),
  ('Drinks'),
  ('Sobremesa'),
  ('Prato executivo'),
  ('Vegetariano'),
  ('Outro');
