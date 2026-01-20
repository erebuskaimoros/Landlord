-- Phase 2: Asset Maintenance Logs
-- Track service history for assets

-- Create asset_maintenance_logs table
CREATE TABLE asset_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    cost DECIMAL(10, 2),
    performed_by VARCHAR(255),
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_asset_logs_org ON asset_maintenance_logs(organization_id);
CREATE INDEX idx_asset_logs_asset ON asset_maintenance_logs(asset_id);
CREATE INDEX idx_asset_logs_task ON asset_maintenance_logs(task_id);
CREATE INDEX idx_asset_logs_contractor ON asset_maintenance_logs(contractor_id);
CREATE INDEX idx_asset_logs_date ON asset_maintenance_logs(service_date DESC);
CREATE INDEX idx_asset_logs_type ON asset_maintenance_logs(organization_id, service_type);

-- Trigger for updated_at
CREATE TRIGGER update_asset_maintenance_logs_updated_at
    BEFORE UPDATE ON asset_maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view maintenance logs in their organizations"
    ON asset_maintenance_logs FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create maintenance logs in their organizations"
    ON asset_maintenance_logs FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update maintenance logs in their organizations"
    ON asset_maintenance_logs FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete maintenance logs in their organizations"
    ON asset_maintenance_logs FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Audit trigger
CREATE TRIGGER asset_maintenance_logs_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON asset_maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Add comment
COMMENT ON TABLE asset_maintenance_logs IS 'Service history for assets tracking repairs, maintenance, and inspections';
