-- ============================================================
-- RPE FLOW — Migration 003: Functions and Triggers
-- ============================================================

-- ============================================================
-- Audit trigger for approaches
-- ============================================================
CREATE OR REPLACE FUNCTION audit_approach_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to get current user's profile id
  SELECT id INTO v_user_id
  FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (record_id, table_name, user_id, action, new_values)
    VALUES (NEW.id, 'approaches', v_user_id, 'CREATE', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (record_id, table_name, user_id, action, old_values, new_values)
    VALUES (NEW.id, 'approaches', v_user_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (record_id, table_name, user_id, action, old_values)
    VALUES (OLD.id, 'approaches', v_user_id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_approaches
  AFTER INSERT OR UPDATE OR DELETE ON approaches
  FOR EACH ROW EXECUTE FUNCTION audit_approach_changes();

-- ============================================================
-- Dashboard summary function (aggregation in DB)
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_campaign_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_hostess_id UUID DEFAULT NULL,
  p_audience_profile_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_approaches BIGINT,
  total_people BIGINT,
  converted_groups BIGINT,
  converted_people BIGINT,
  not_converted_groups BIGINT,
  not_converted_people BIGINT,
  group_conversion_rate NUMERIC,
  people_conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_approaches,
    COALESCE(SUM(a.group_size), 0)::BIGINT AS total_people,
    COUNT(*) FILTER (WHERE a.converted = true)::BIGINT AS converted_groups,
    COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = true), 0)::BIGINT AS converted_people,
    COUNT(*) FILTER (WHERE a.converted = false)::BIGINT AS not_converted_groups,
    COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = false), 0)::BIGINT AS not_converted_people,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE a.converted = true)::NUMERIC / COUNT(*)::NUMERIC * 100, 1)
      ELSE 0
    END AS group_conversion_rate,
    CASE 
      WHEN COALESCE(SUM(a.group_size), 0) > 0 THEN ROUND(COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = true), 0)::NUMERIC / SUM(a.group_size)::NUMERIC * 100, 1)
      ELSE 0
    END AS people_conversion_rate
  FROM approaches a
  WHERE a.deleted_at IS NULL
    AND (p_campaign_id IS NULL OR a.campaign_id = p_campaign_id)
    AND (p_unit_id IS NULL OR a.unit_id = p_unit_id)
    AND (p_hostess_id IS NULL OR a.hostess_id = p_hostess_id)
    AND (p_audience_profile_id IS NULL OR a.audience_profile_id = p_audience_profile_id)
    AND (p_start_date IS NULL OR a.created_at >= p_start_date)
    AND (p_end_date IS NULL OR a.created_at < p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Hourly performance function
-- ============================================================
CREATE OR REPLACE FUNCTION get_hourly_performance(
  p_campaign_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_hostess_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  hour INTEGER,
  approaches BIGINT,
  people BIGINT,
  converted_people BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM a.created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS hour,
    COUNT(*)::BIGINT AS approaches,
    SUM(a.group_size)::BIGINT AS people,
    COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = true), 0)::BIGINT AS converted_people,
    CASE 
      WHEN SUM(a.group_size) > 0 THEN ROUND(COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = true), 0)::NUMERIC / SUM(a.group_size)::NUMERIC * 100, 1)
      ELSE 0
    END AS conversion_rate
  FROM approaches a
  WHERE a.deleted_at IS NULL
    AND (p_campaign_id IS NULL OR a.campaign_id = p_campaign_id)
    AND (p_unit_id IS NULL OR a.unit_id = p_unit_id)
    AND (p_hostess_id IS NULL OR a.hostess_id = p_hostess_id)
    AND (p_start_date IS NULL OR a.created_at >= p_start_date)
    AND (p_end_date IS NULL OR a.created_at < p_end_date)
  GROUP BY EXTRACT(HOUR FROM a.created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Hostess performance function
-- ============================================================
CREATE OR REPLACE FUNCTION get_hostess_performance(
  p_campaign_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  hostess_id UUID,
  hostess_name TEXT,
  approaches BIGINT,
  people_approached BIGINT,
  people_converted BIGINT,
  group_conversion_rate NUMERIC,
  people_conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.hostess_id,
    p.name AS hostess_name,
    COUNT(*)::BIGINT AS approaches,
    SUM(a.group_size)::BIGINT AS people_approached,
    COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = true), 0)::BIGINT AS people_converted,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE a.converted = true)::NUMERIC / COUNT(*)::NUMERIC * 100, 1)
      ELSE 0
    END AS group_conversion_rate,
    CASE 
      WHEN SUM(a.group_size) > 0 THEN ROUND(COALESCE(SUM(a.group_size) FILTER (WHERE a.converted = true), 0)::NUMERIC / SUM(a.group_size)::NUMERIC * 100, 1)
      ELSE 0
    END AS people_conversion_rate
  FROM approaches a
  JOIN profiles p ON p.id = a.hostess_id
  WHERE a.deleted_at IS NULL
    AND (p_campaign_id IS NULL OR a.campaign_id = p_campaign_id)
    AND (p_unit_id IS NULL OR a.unit_id = p_unit_id)
    AND (p_start_date IS NULL OR a.created_at >= p_start_date)
    AND (p_end_date IS NULL OR a.created_at < p_end_date)
  GROUP BY a.hostess_id, p.name
  ORDER BY people_converted DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
