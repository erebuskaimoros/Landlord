-- Phase 2: Photos (Unit Media)
-- Photo management with event-based organization

-- Photo event type enum
CREATE TYPE photo_event_type AS ENUM (
  'move_in',
  'move_out',
  'maintenance',
  'inspection',
  'general'
);

-- Create photos table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    event_type photo_event_type NOT NULL DEFAULT 'general',
    caption TEXT,
    taken_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_photos_org ON photos(organization_id);
CREATE INDEX idx_photos_unit ON photos(unit_id);
CREATE INDEX idx_photos_org_unit ON photos(organization_id, unit_id);
CREATE INDEX idx_photos_event_type ON photos(organization_id, event_type);
CREATE INDEX idx_photos_created ON photos(created_at DESC);
CREATE INDEX idx_photos_taken ON photos(taken_at DESC) WHERE taken_at IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view photos in their organizations"
    ON photos FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Managers can create photos in their organizations"
    ON photos FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Managers can update photos in their organizations"
    ON photos FOR UPDATE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'manager')
    );

CREATE POLICY "Owners can delete photos in their organizations"
    ON photos FOR DELETE
    USING (
        organization_id IN (SELECT get_user_organization_ids())
        AND user_has_role(organization_id, 'owner')
    );

-- Audit trigger
CREATE TRIGGER photos_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Add comment
COMMENT ON TABLE photos IS 'Unit photos with event-based organization (move-in, move-out, maintenance, etc.)';

-- Create storage bucket for photos (run manually in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('unit-photos', 'unit-photos', false);
