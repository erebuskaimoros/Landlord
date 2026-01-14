-- Landlord Property Management SaaS - Row Level Security Policies
-- All data scoped to organization_id for multi-tenant isolation

-- ============================================================================
-- HELPER FUNCTION: Get user's organization IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID AS $$
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- HELPER FUNCTION: Check if user has role in organization
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_role(org_id UUID, required_role user_role)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND (
            role = required_role
            OR role = 'owner'
            OR (required_role = 'viewer' AND role IN ('owner', 'manager'))
        )
    )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_unit_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view organizations they belong to"
    ON organizations FOR SELECT
    USING (id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Owners can update their organizations"
    ON organizations FOR UPDATE
    USING (user_has_role(id, 'owner'));

CREATE POLICY "Owners can delete their organizations"
    ON organizations FOR DELETE
    USING (user_has_role(id, 'owner'));

-- ============================================================================
-- ORGANIZATION MEMBERS POLICIES
-- ============================================================================
CREATE POLICY "Members can view members in their organizations"
    ON organization_members FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners can add members"
    ON organization_members FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'owner'));

CREATE POLICY "Owners can update member roles"
    ON organization_members FOR UPDATE
    USING (user_has_role(organization_id, 'owner'));

CREATE POLICY "Owners can remove members"
    ON organization_members FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- ORGANIZATION INVITATIONS POLICIES
-- ============================================================================
CREATE POLICY "Members can view invitations for their organizations"
    ON organization_invitations FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners can create invitations"
    ON organization_invitations FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'owner'));

CREATE POLICY "Owners can delete invitations"
    ON organization_invitations FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles of members in their organizations"
    ON user_profiles FOR SELECT
    USING (
        id IN (
            SELECT om.user_id FROM organization_members om
            WHERE om.organization_id IN (SELECT get_user_organization_ids())
        )
    );

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- ============================================================================
-- BUILDINGS POLICIES
-- ============================================================================
CREATE POLICY "Users can view buildings in their organizations"
    ON buildings FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners and managers can create buildings"
    ON buildings FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners and managers can update buildings"
    ON buildings FOR UPDATE
    USING (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners can delete buildings"
    ON buildings FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- UNITS POLICIES
-- ============================================================================
CREATE POLICY "Users can view units in their organizations"
    ON units FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners and managers can create units"
    ON units FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners and managers can update units"
    ON units FOR UPDATE
    USING (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners can delete units"
    ON units FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- BUILDING UNIT ALLOCATIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view allocations in their organizations"
    ON building_unit_allocations FOR SELECT
    USING (
        building_id IN (
            SELECT id FROM buildings WHERE organization_id IN (SELECT get_user_organization_ids())
        )
    );

CREATE POLICY "Owners and managers can manage allocations"
    ON building_unit_allocations FOR INSERT
    WITH CHECK (
        building_id IN (
            SELECT id FROM buildings WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners and managers can update allocations"
    ON building_unit_allocations FOR UPDATE
    USING (
        building_id IN (
            SELECT id FROM buildings WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners can delete allocations"
    ON building_unit_allocations FOR DELETE
    USING (
        building_id IN (
            SELECT id FROM buildings WHERE user_has_role(organization_id, 'owner')
        )
    );

-- ============================================================================
-- TENANTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view tenants in their organizations"
    ON tenants FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners and managers can create tenants"
    ON tenants FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners and managers can update tenants"
    ON tenants FOR UPDATE
    USING (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners can delete tenants"
    ON tenants FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- LEASES POLICIES
-- ============================================================================
CREATE POLICY "Users can view leases in their organizations"
    ON leases FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners and managers can create leases"
    ON leases FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners and managers can update leases"
    ON leases FOR UPDATE
    USING (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners can delete leases"
    ON leases FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- LEASE DOCUMENTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view lease documents in their organizations"
    ON lease_documents FOR SELECT
    USING (
        lease_id IN (
            SELECT id FROM leases WHERE organization_id IN (SELECT get_user_organization_ids())
        )
    );

CREATE POLICY "Owners and managers can upload lease documents"
    ON lease_documents FOR INSERT
    WITH CHECK (
        lease_id IN (
            SELECT id FROM leases WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners can delete lease documents"
    ON lease_documents FOR DELETE
    USING (
        lease_id IN (
            SELECT id FROM leases WHERE user_has_role(organization_id, 'owner')
        )
    );

-- ============================================================================
-- TENANT TIMELINE EVENTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view timeline events in their organizations"
    ON tenant_timeline_events FOR SELECT
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE organization_id IN (SELECT get_user_organization_ids())
        )
    );

CREATE POLICY "Owners and managers can create timeline events"
    ON tenant_timeline_events FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners and managers can update timeline events"
    ON tenant_timeline_events FOR UPDATE
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners can delete timeline events"
    ON tenant_timeline_events FOR DELETE
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE user_has_role(organization_id, 'owner')
        )
    );

-- ============================================================================
-- TRANSACTION CATEGORIES POLICIES
-- ============================================================================
CREATE POLICY "Users can view system default categories"
    ON transaction_categories FOR SELECT
    USING (is_system_default = true OR organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners can create custom categories"
    ON transaction_categories FOR INSERT
    WITH CHECK (
        is_system_default = false AND user_has_role(organization_id, 'owner')
    );

CREATE POLICY "Owners can update custom categories"
    ON transaction_categories FOR UPDATE
    USING (
        is_system_default = false AND user_has_role(organization_id, 'owner')
    );

CREATE POLICY "Owners can delete custom categories"
    ON transaction_categories FOR DELETE
    USING (
        is_system_default = false AND user_has_role(organization_id, 'owner')
    );

-- ============================================================================
-- TRANSACTIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view transactions in their organizations"
    ON transactions FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Owners and managers can create transactions"
    ON transactions FOR INSERT
    WITH CHECK (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners and managers can update transactions"
    ON transactions FOR UPDATE
    USING (user_has_role(organization_id, 'manager'));

CREATE POLICY "Owners can delete transactions"
    ON transactions FOR DELETE
    USING (user_has_role(organization_id, 'owner'));

-- ============================================================================
-- TRANSACTION ALLOCATIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can view allocations in their organizations"
    ON transaction_allocations FOR SELECT
    USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE organization_id IN (SELECT get_user_organization_ids())
        )
    );

CREATE POLICY "Owners and managers can create allocations"
    ON transaction_allocations FOR INSERT
    WITH CHECK (
        transaction_id IN (
            SELECT id FROM transactions WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners and managers can update allocations"
    ON transaction_allocations FOR UPDATE
    USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE user_has_role(organization_id, 'manager')
        )
    );

CREATE POLICY "Owners can delete allocations"
    ON transaction_allocations FOR DELETE
    USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE user_has_role(organization_id, 'owner')
        )
    );

-- ============================================================================
-- AUDIT LOGS POLICIES (Read-only for organization members)
-- ============================================================================
CREATE POLICY "Users can view audit logs for their organizations"
    ON audit_logs FOR SELECT
    USING (organization_id IN (SELECT get_user_organization_ids()));

-- Audit logs are INSERT only via trigger - no direct user inserts
