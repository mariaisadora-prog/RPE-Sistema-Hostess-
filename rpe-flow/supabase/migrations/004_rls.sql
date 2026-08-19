-- ============================================================
-- RPE FLOW — Migration 004: Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE approaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: get current user's profile
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_unit_access(p_unit_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN user_units uu ON uu.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
    AND (p.role = 'admin' OR uu.unit_id = p_unit_id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
-- Users can read their own profile; admins can read all
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    auth_user_id = auth.uid() OR is_admin()
  );

-- Only admins can insert/update profiles (except auto-creation)
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid() OR is_admin()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (
    auth_user_id = auth.uid() OR is_admin()
  );

-- ============================================================
-- UNITS
-- ============================================================
-- All authenticated users can read active units
CREATE POLICY units_select ON units
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can manage units
CREATE POLICY units_insert ON units
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY units_update ON units
  FOR UPDATE USING (is_admin());

CREATE POLICY units_delete ON units
  FOR DELETE USING (is_admin());

-- ============================================================
-- USER_UNITS
-- ============================================================
-- Users can see their own; admins can see all
CREATE POLICY user_units_select ON user_units
  FOR SELECT USING (
    user_id = get_my_profile_id() OR is_admin()
  );

CREATE POLICY user_units_insert ON user_units
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY user_units_update ON user_units
  FOR UPDATE USING (is_admin());

CREATE POLICY user_units_delete ON user_units
  FOR DELETE USING (is_admin());

-- ============================================================
-- CAMPAIGNS
-- ============================================================
-- All authenticated users can read campaigns
CREATE POLICY campaigns_select ON campaigns
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can manage campaigns
CREATE POLICY campaigns_insert ON campaigns
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY campaigns_update ON campaigns
  FOR UPDATE USING (is_admin());

CREATE POLICY campaigns_delete ON campaigns
  FOR DELETE USING (is_admin());

-- ============================================================
-- CAMPAIGN_UNITS
-- ============================================================
CREATE POLICY campaign_units_select ON campaign_units
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY campaign_units_insert ON campaign_units
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY campaign_units_delete ON campaign_units
  FOR DELETE USING (is_admin());

-- ============================================================
-- AUDIENCE_PROFILES (campaign options)
-- ============================================================
CREATE POLICY audience_profiles_select ON audience_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY audience_profiles_insert ON audience_profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY audience_profiles_update ON audience_profiles
  FOR UPDATE USING (is_admin());

-- ============================================================
-- CAMPAIGN_INTERESTS
-- ============================================================
CREATE POLICY campaign_interests_select ON campaign_interests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY campaign_interests_insert ON campaign_interests
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY campaign_interests_update ON campaign_interests
  FOR UPDATE USING (is_admin());

-- ============================================================
-- LOSS_REASONS
-- ============================================================
CREATE POLICY loss_reasons_select ON loss_reasons
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY loss_reasons_insert ON loss_reasons
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY loss_reasons_update ON loss_reasons
  FOR UPDATE USING (is_admin());

-- ============================================================
-- COMPETITORS
-- ============================================================
CREATE POLICY competitors_select ON competitors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY competitors_insert ON competitors
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY competitors_update ON competitors
  FOR UPDATE USING (is_admin());

-- ============================================================
-- APPROACHES
-- ============================================================

-- SELECT: hostess sees own; manager sees linked units; admin sees all
CREATE POLICY approaches_select ON approaches
  FOR SELECT USING (
    deleted_at IS NULL AND (
      hostess_id = get_my_profile_id()
      OR has_unit_access(unit_id)
    )
  );

-- INSERT: hostess can only insert for themselves
CREATE POLICY approaches_insert ON approaches
  FOR INSERT WITH CHECK (
    hostess_id = get_my_profile_id()
  );

-- UPDATE: hostess within 10 min window; manager for linked units; admin always
CREATE POLICY approaches_update ON approaches
  FOR UPDATE USING (
    (
      -- Hostess: own records within 10 minutes
      hostess_id = get_my_profile_id()
      AND get_my_role() = 'hostess'
      AND created_at > NOW() - INTERVAL '10 minutes'
    )
    OR (
      -- Manager: linked units
      get_my_role() = 'manager'
      AND has_unit_access(unit_id)
    )
    OR is_admin()
  );

-- DELETE: soft delete only - same rules as update for manager/admin
CREATE POLICY approaches_delete ON approaches
  FOR DELETE USING (
    get_my_role() IN ('manager', 'admin')
    AND (has_unit_access(unit_id) OR is_admin())
  );

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
-- Only admins can read audit logs; inserts handled by triggers (SECURITY DEFINER)
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (is_admin());

-- Allow trigger-based inserts (the trigger function uses SECURITY DEFINER)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (true);
