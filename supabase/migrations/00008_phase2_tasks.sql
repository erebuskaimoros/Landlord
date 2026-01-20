-- Phase 2: Tasks (Work Orders) and Recurring Tasks
-- Maintenance requests with status tracking and scheduling

-- Task status enum
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'open',
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date DATE,
    assigned_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recurring_tasks table
CREATE TABLE recurring_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority task_priority NOT NULL DEFAULT 'medium',
    interval_days INTEGER NOT NULL CHECK (interval_days > 0),
    next_due_date DATE NOT NULL,
    last_generated_at TIMESTAMPTZ,
    assigned_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_unit ON tasks(unit_id);
CREATE INDEX idx_tasks_contractor ON tasks(assigned_contractor_id);
CREATE INDEX idx_tasks_org_status ON tasks(organization_id, status);
CREATE INDEX idx_tasks_org_unit ON tasks(organization_id, unit_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status IN ('open', 'in_progress');
CREATE INDEX idx_tasks_status ON tasks(status);

-- Indexes for recurring_tasks
CREATE INDEX idx_recurring_tasks_org ON recurring_tasks(organization_id);
CREATE INDEX idx_recurring_tasks_unit ON recurring_tasks(unit_id);
CREATE INDEX idx_recurring_tasks_active ON recurring_tasks(organization_id, is_active, next_due_date);

-- Trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on recurring_tasks
CREATE TRIGGER update_recurring_tasks_updated_at
    BEFORE UPDATE ON recurring_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their organizations"
    ON tasks FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create tasks in their organizations"
    ON tasks FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update tasks in their organizations"
    ON tasks FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete tasks in their organizations"
    ON tasks FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Enable RLS on recurring_tasks
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_tasks
CREATE POLICY "Users can view recurring tasks in their organizations"
    ON recurring_tasks FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create recurring tasks in their organizations"
    ON recurring_tasks FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update recurring tasks in their organizations"
    ON recurring_tasks FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete recurring tasks in their organizations"
    ON recurring_tasks FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Audit triggers
CREATE TRIGGER tasks_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER recurring_tasks_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON recurring_tasks
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Add comments
COMMENT ON TABLE tasks IS 'Work orders and maintenance tasks for units';
COMMENT ON TABLE recurring_tasks IS 'Scheduled recurring task templates';
