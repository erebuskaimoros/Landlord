-- Phase 2: Assets (Unit Equipment)
-- Track appliances and systems with lifecycle management

-- Asset condition enum
CREATE TYPE asset_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

-- Create assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    warranty_expiry DATE,
    expected_lifespan_years INTEGER,
    condition asset_condition DEFAULT 'good',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assets_org ON assets(organization_id);
CREATE INDEX idx_assets_unit ON assets(unit_id);
CREATE INDEX idx_assets_org_unit ON assets(organization_id, unit_id);
CREATE INDEX idx_assets_type ON assets(organization_id, asset_type);
CREATE INDEX idx_assets_warranty ON assets(warranty_expiry) WHERE warranty_expiry IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view assets in their organizations"
    ON assets FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create assets in their organizations"
    ON assets FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update assets in their organizations"
    ON assets FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete assets in their organizations"
    ON assets FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Audit trigger
CREATE TRIGGER assets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Add comment
COMMENT ON TABLE assets IS 'Unit equipment and appliances with lifecycle tracking';
