-- Landlord Property Management SaaS - Audit Triggers
-- Captures all changes to audited tables

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Try to get organization_id from the record
    IF TG_OP = 'DELETE' THEN
        -- Try to get org_id from OLD record
        IF TG_TABLE_NAME IN ('organizations') THEN
            org_id := OLD.id;
        ELSIF OLD ? 'organization_id' OR TG_TABLE_NAME IN ('buildings', 'units', 'tenants', 'leases', 'transactions') THEN
            org_id := OLD.organization_id;
        END IF;

        INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (org_id, auth.uid(), TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), NULL);

        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Get org_id from NEW record
        IF TG_TABLE_NAME IN ('organizations') THEN
            org_id := NEW.id;
        ELSIF TG_TABLE_NAME IN ('buildings', 'units', 'tenants', 'leases', 'transactions') THEN
            org_id := NEW.organization_id;
        END IF;

        INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));

        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        -- Get org_id from NEW record
        IF TG_TABLE_NAME IN ('organizations') THEN
            org_id := NEW.id;
        ELSIF TG_TABLE_NAME IN ('buildings', 'units', 'tenants', 'leases', 'transactions') THEN
            org_id := NEW.organization_id;
        END IF;

        INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, NULL, to_jsonb(NEW));

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- APPLY AUDIT TRIGGERS TO TABLES
-- ============================================================================

-- Organizations
CREATE TRIGGER audit_organizations
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Units
CREATE TRIGGER audit_units
    AFTER INSERT OR UPDATE OR DELETE ON units
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Buildings
CREATE TRIGGER audit_buildings
    AFTER INSERT OR UPDATE OR DELETE ON buildings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Tenants
CREATE TRIGGER audit_tenants
    AFTER INSERT OR UPDATE OR DELETE ON tenants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Leases
CREATE TRIGGER audit_leases
    AFTER INSERT OR UPDATE OR DELETE ON leases
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Transactions
CREATE TRIGGER audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Organization Members
CREATE TRIGGER audit_organization_members
    AFTER INSERT OR UPDATE OR DELETE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
