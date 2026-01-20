-- Phase 2: Contractors table
-- Vendor management with service types and ratings

-- Create contractors table
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    service_types TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10, 2),
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_jobs INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contractors_org ON contractors(organization_id);
CREATE INDEX idx_contractors_service_types ON contractors USING GIN(service_types);
CREATE INDEX idx_contractors_name ON contractors(organization_id, name);

-- Trigger for updated_at
CREATE TRIGGER update_contractors_updated_at
    BEFORE UPDATE ON contractors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contractors in their organizations"
    ON contractors FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create contractors in their organizations"
    ON contractors FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update contractors in their organizations"
    ON contractors FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete contractors in their organizations"
    ON contractors FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Audit trigger
CREATE TRIGGER contractors_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contractors
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Add comment
COMMENT ON TABLE contractors IS 'Contractor/vendor records for maintenance and service work';
