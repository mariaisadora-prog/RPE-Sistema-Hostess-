-- ============================================================
-- RPE FLOW — Migration 002: Indexes
-- ============================================================

-- Approaches: individual indexes for frequent queries
CREATE INDEX idx_approaches_created_at ON approaches(created_at);
CREATE INDEX idx_approaches_campaign_id ON approaches(campaign_id);
CREATE INDEX idx_approaches_unit_id ON approaches(unit_id);
CREATE INDEX idx_approaches_hostess_id ON approaches(hostess_id);
CREATE INDEX idx_approaches_converted ON approaches(converted);
CREATE INDEX idx_approaches_deleted_at ON approaches(deleted_at);

-- Approaches: composite index for dashboard queries
CREATE INDEX idx_approaches_dashboard ON approaches(campaign_id, unit_id, created_at);

-- Approaches: composite for filtering active records
CREATE INDEX idx_approaches_active ON approaches(campaign_id, unit_id, created_at) WHERE deleted_at IS NULL;

-- Auxiliary tables: campaign_id lookups
CREATE INDEX idx_audience_profiles_campaign ON audience_profiles(campaign_id);
CREATE INDEX idx_campaign_interests_campaign ON campaign_interests(campaign_id);
CREATE INDEX idx_loss_reasons_campaign ON loss_reasons(campaign_id);
CREATE INDEX idx_competitors_campaign ON competitors(campaign_id);
CREATE INDEX idx_competitors_unit ON competitors(unit_id);

-- User lookups
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_user_units_user_id ON user_units(user_id);
CREATE INDEX idx_user_units_unit_id ON user_units(unit_id);

-- Campaign units
CREATE INDEX idx_campaign_units_campaign ON campaign_units(campaign_id);
CREATE INDEX idx_campaign_units_unit ON campaign_units(unit_id);

-- Audit logs
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_table_action ON audit_logs(table_name, action);
