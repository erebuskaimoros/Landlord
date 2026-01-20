-- Fix organization creation for new users
-- Problem: After signUp(), the session may not be fully established for RLS checks
-- Solution: Use a SECURITY DEFINER function to create org + membership atomically

-- Create function to create organization with owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
    org_name TEXT,
    owner_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create the organization
    INSERT INTO organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    -- Add the user as owner
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, owner_user_id, 'owner');

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO authenticated;

-- Keep original policies but also add fallback for direct inserts
-- Drop existing policy
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Create new policy that allows authenticated users
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Fix organization_members policy for first member
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;

CREATE POLICY "Users can add themselves as owner or owners can add members"
    ON organization_members FOR INSERT
    WITH CHECK (
        -- Allow user to add themselves as owner
        (user_id = auth.uid() AND role = 'owner')
        OR
        -- Allow existing owners to add other members
        user_has_role(organization_id, 'owner')
    );
