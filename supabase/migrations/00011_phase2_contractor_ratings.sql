-- Phase 2: Contractor Ratings
-- Rate contractors after task completion

-- Create contractor_ratings table
CREATE TABLE contractor_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    rated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id)  -- One rating per task
);

-- Indexes
CREATE INDEX idx_contractor_ratings_org ON contractor_ratings(organization_id);
CREATE INDEX idx_contractor_ratings_contractor ON contractor_ratings(contractor_id);
CREATE INDEX idx_contractor_ratings_task ON contractor_ratings(task_id);
CREATE INDEX idx_contractor_ratings_rating ON contractor_ratings(contractor_id, rating);

-- Trigger for updated_at
CREATE TRIGGER update_contractor_ratings_updated_at
    BEFORE UPDATE ON contractor_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE contractor_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ratings in their organizations"
    ON contractor_ratings FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create ratings in their organizations"
    ON contractor_ratings FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update ratings in their organizations"
    ON contractor_ratings FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete ratings in their organizations"
    ON contractor_ratings FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Function to update contractor average rating
CREATE OR REPLACE FUNCTION update_contractor_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE contractors
        SET
            average_rating = (
                SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
                FROM contractor_ratings
                WHERE contractor_id = NEW.contractor_id
            ),
            total_jobs = (
                SELECT COUNT(*)
                FROM contractor_ratings
                WHERE contractor_id = NEW.contractor_id
            )
        WHERE id = NEW.contractor_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contractors
        SET
            average_rating = (
                SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
                FROM contractor_ratings
                WHERE contractor_id = OLD.contractor_id
            ),
            total_jobs = (
                SELECT COUNT(*)
                FROM contractor_ratings
                WHERE contractor_id = OLD.contractor_id
            )
        WHERE id = OLD.contractor_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contractor rating on rating change
CREATE TRIGGER contractor_rating_update_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contractor_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_rating();

-- Audit trigger
CREATE TRIGGER contractor_ratings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contractor_ratings
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Add comment
COMMENT ON TABLE contractor_ratings IS 'Ratings and reviews for contractors after task completion';
