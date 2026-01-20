-- Landlord Property Management SaaS - RLS & Audit Hardening
-- Slice 8: Security and performance improvements

-- ============================================================================
-- FIX: Update audit trigger function to handle all tables correctly
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    record_data RECORD;
BEGIN
    -- Determine which record to use based on operation
    IF TG_OP = 'DELETE' THEN
        record_data := OLD;
    ELSE
        record_data := NEW;
    END IF;

    -- Get organization_id based on table
    CASE TG_TABLE_NAME
        WHEN 'organizations' THEN
            org_id := record_data.id;
        WHEN 'organization_members' THEN
            org_id := record_data.organization_id;
        WHEN 'organization_invitations' THEN
            org_id := record_data.organization_id;
        WHEN 'buildings' THEN
            org_id := record_data.organization_id;
        WHEN 'units' THEN
            org_id := record_data.organization_id;
        WHEN 'tenants' THEN
            org_id := record_data.organization_id;
        WHEN 'leases' THEN
            org_id := record_data.organization_id;
        WHEN 'transactions' THEN
            org_id := record_data.organization_id;
        WHEN 'lease_documents' THEN
            -- Get org_id from parent lease
            SELECT l.organization_id INTO org_id
            FROM leases l WHERE l.id = record_data.lease_id;
        WHEN 'tenant_timeline_events' THEN
            -- Get org_id from parent tenant
            SELECT t.organization_id INTO org_id
            FROM tenants t WHERE t.id = record_data.tenant_id;
        WHEN 'transaction_allocations' THEN
            -- Get org_id from parent transaction
            SELECT tr.organization_id INTO org_id
            FROM transactions tr WHERE tr.id = record_data.transaction_id;
        WHEN 'building_unit_allocations' THEN
            -- Get org_id from parent building
            SELECT b.organization_id INTO org_id
            FROM buildings b WHERE b.id = record_data.building_id;
        ELSE
            org_id := NULL;
    END CASE;

    -- Insert audit log
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (org_id, auth.uid(), TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADD: Missing audit triggers
-- ============================================================================

-- Organization Invitations
CREATE TRIGGER audit_organization_invitations
    AFTER INSERT OR UPDATE OR DELETE ON organization_invitations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Lease Documents
CREATE TRIGGER audit_lease_documents
    AFTER INSERT OR UPDATE OR DELETE ON lease_documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Tenant Timeline Events
CREATE TRIGGER audit_tenant_timeline_events
    AFTER INSERT OR UPDATE OR DELETE ON tenant_timeline_events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Transaction Allocations
CREATE TRIGGER audit_transaction_allocations
    AFTER INSERT OR UPDATE OR DELETE ON transaction_allocations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Building Unit Allocations
CREATE TRIGGER audit_building_unit_allocations
    AFTER INSERT OR UPDATE OR DELETE ON building_unit_allocations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- ADD: Missing indexes for common query patterns
-- ============================================================================

-- Lease status filtering (for active leases queries)
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);

-- Unit status filtering (for vacancy queries)
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- Composite indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_leases_org_status ON leases(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_units_org_status ON units(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_org_type ON transactions(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON transactions(organization_id, transaction_date DESC);

-- Lease expiration lookups (for upcoming expirations dashboard)
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON leases(end_date) WHERE status = 'active';

-- Audit logs user lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ============================================================================
-- FIX: Restrict invitation token visibility to owners only
-- ============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Members can view invitations for their organizations" ON organization_invitations;

-- Create new policies: owners see everything, others see limited info
CREATE POLICY "Owners can view full invitations"
    ON organization_invitations FOR SELECT
    USING (user_has_role(organization_id, 'owner'));

-- Note: Non-owners cannot see invitations at all for security
-- If needed, create a view that excludes the token column

-- ============================================================================
-- ADD: Rate limiting helper for organization creation (optional enforcement)
-- ============================================================================

-- Function to count recent organizations created by user
CREATE OR REPLACE FUNCTION count_user_organizations()
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- SECURITY: Ensure audit_logs cannot be modified by users
-- ============================================================================

-- Explicitly deny INSERT/UPDATE/DELETE for audit_logs
-- (RLS is enabled, and no policies grant write access)
-- Adding explicit deny policies for clarity

CREATE POLICY "No user can insert audit logs directly"
    ON audit_logs FOR INSERT
    WITH CHECK (false);

CREATE POLICY "No user can update audit logs"
    ON audit_logs FOR UPDATE
    USING (false);

CREATE POLICY "No user can delete audit logs"
    ON audit_logs FOR DELETE
    USING (false);

-- ============================================================================
-- VALIDATION: Add constraint for lease date sanity
-- ============================================================================

-- Ensure end_date is after start_date when both are present
ALTER TABLE leases
    ADD CONSTRAINT lease_dates_valid
    CHECK (end_date IS NULL OR end_date >= start_date);

-- ============================================================================
-- VALIDATION: Add constraint for transaction amounts
-- ============================================================================

-- Ensure actual_amount is positive
ALTER TABLE transactions
    ADD CONSTRAINT transaction_amount_positive
    CHECK (actual_amount >= 0);

-- Ensure expected_amount is positive when present
ALTER TABLE transactions
    ADD CONSTRAINT transaction_expected_positive
    CHECK (expected_amount IS NULL OR expected_amount >= 0);

-- ============================================================================
-- PERFORMANCE: Database function for financial aggregations
-- Avoids fetching all transactions to JavaScript for summing
-- ============================================================================
CREATE OR REPLACE FUNCTION get_financial_totals(org_id UUID)
RETURNS TABLE (
    total_income NUMERIC,
    total_expense NUMERIC,
    net_income NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN actual_amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN actual_amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN actual_amount ELSE -actual_amount END), 0) AS net_income
    FROM transactions
    WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PERFORMANCE: Database function for dashboard stats in single call
-- Reduces multiple count queries to one
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(org_id UUID)
RETURNS TABLE (
    total_units BIGINT,
    vacant_units BIGINT,
    total_tenants BIGINT,
    active_leases BIGINT,
    total_transactions BIGINT,
    vacancy_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM units WHERE organization_id = org_id) AS total_units,
        (SELECT COUNT(*) FROM units WHERE organization_id = org_id AND status = 'vacant') AS vacant_units,
        (SELECT COUNT(*) FROM tenants WHERE organization_id = org_id) AS total_tenants,
        (SELECT COUNT(*) FROM leases WHERE organization_id = org_id AND status = 'active') AS active_leases,
        (SELECT COUNT(*) FROM transactions WHERE organization_id = org_id) AS total_transactions,
        CASE
            WHEN (SELECT COUNT(*) FROM units WHERE organization_id = org_id) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(*) FROM units WHERE organization_id = org_id AND status = 'vacant')::NUMERIC /
                (SELECT COUNT(*) FROM units WHERE organization_id = org_id)::NUMERIC * 100,
                1
            )
        END AS vacancy_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PERFORMANCE: Text search indexes for global search
-- ============================================================================

-- Requires pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for text search patterns
CREATE INDEX IF NOT EXISTS idx_units_address_gin ON units USING gin (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenants_name_gin ON tenants USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_buildings_name_gin ON buildings USING gin (name gin_trgm_ops);
