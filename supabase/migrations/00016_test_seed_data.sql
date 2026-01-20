-- Test Seed Data for Landlord Property Management
-- This provides realistic test data for development and testing
-- Run with: supabase db reset

-- ============================================================================
-- IMPORTANT: This seed runs as postgres which bypasses RLS
-- ============================================================================

-- Fixed UUIDs for predictable relationships
-- Organization
DO $$
DECLARE
    org_id UUID := '11111111-1111-1111-1111-111111111111';

    -- Buildings
    building_maple_id UUID := '22222222-2222-2222-2222-222222222221';
    building_oak_id UUID := '22222222-2222-2222-2222-222222222222';

    -- Units
    unit_maple_1a_id UUID := '33333333-3333-3333-3333-333333333331';
    unit_maple_1b_id UUID := '33333333-3333-3333-3333-333333333332';
    unit_oak_a_id UUID := '33333333-3333-3333-3333-333333333333';
    unit_oak_b_id UUID := '33333333-3333-3333-3333-333333333334';
    unit_pine_id UUID := '33333333-3333-3333-3333-333333333335';

    -- Tenants
    tenant_john_id UUID := '44444444-4444-4444-4444-444444444441';
    tenant_sarah_id UUID := '44444444-4444-4444-4444-444444444442';
    tenant_mike_id UUID := '44444444-4444-4444-4444-444444444443';
    tenant_emily_id UUID := '44444444-4444-4444-4444-444444444444';
    tenant_robert_id UUID := '44444444-4444-4444-4444-444444444445';

    -- Leases
    lease_john_id UUID := '55555555-5555-5555-5555-555555555551';
    lease_sarah_id UUID := '55555555-5555-5555-5555-555555555552';
    lease_mike_id UUID := '55555555-5555-5555-5555-555555555553';
    lease_emily_id UUID := '55555555-5555-5555-5555-555555555554';
    lease_robert_id UUID := '55555555-5555-5555-5555-555555555555';

    -- Contractors
    contractor_plumber_id UUID := '66666666-6666-6666-6666-666666666661';
    contractor_electric_id UUID := '66666666-6666-6666-6666-666666666662';
    contractor_landscape_id UUID := '66666666-6666-6666-6666-666666666663';

    -- Tasks
    task_faucet_id UUID := '77777777-7777-7777-7777-777777777771';
    task_hvac_id UUID := '77777777-7777-7777-7777-777777777772';
    task_paint_id UUID := '77777777-7777-7777-7777-777777777773';
    task_water_heater_id UUID := '77777777-7777-7777-7777-777777777774';
    task_gutter_id UUID := '77777777-7777-7777-7777-777777777775';
    task_window_id UUID := '77777777-7777-7777-7777-777777777776';

    -- Assets
    asset_fridge_maple_1a_id UUID := '88888888-8888-8888-8888-888888888881';
    asset_hvac_maple_1a_id UUID := '88888888-8888-8888-8888-888888888882';
    asset_fridge_maple_1b_id UUID := '88888888-8888-8888-8888-888888888883';
    asset_hvac_oak_a_id UUID := '88888888-8888-8888-8888-888888888884';
    asset_water_heater_oak_a_id UUID := '88888888-8888-8888-8888-888888888885';
    asset_hvac_pine_id UUID := '88888888-8888-8888-8888-888888888886';
    asset_water_heater_pine_id UUID := '88888888-8888-8888-8888-888888888887';
    asset_fridge_pine_id UUID := '88888888-8888-8888-8888-888888888888';

    -- Transaction categories (get from existing)
    cat_rent_id UUID;
    cat_repair_id UUID;
    cat_utilities_id UUID;
    cat_insurance_id UUID;

BEGIN
    -- ============================================================================
    -- ORGANIZATION
    -- ============================================================================
    INSERT INTO organizations (id, name)
    VALUES (org_id, 'Acme Property Management')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- BUILDINGS
    -- ============================================================================
    INSERT INTO buildings (id, organization_id, name, address, notes) VALUES
    (building_maple_id, org_id, 'Maple Street Apartments', '123 Maple Street, Austin, TX 78701', 'Two-unit building in downtown area. Well-maintained 1950s construction.'),
    (building_oak_id, org_id, 'Oak Court Duplex', '456 Oak Court, Austin, TX 78702', 'Duplex near UT campus. Good rental history.')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- UNITS
    -- ============================================================================
    INSERT INTO units (id, organization_id, building_id, address, unit_number, city, state, zip_code,
                       property_type, bedrooms, bathrooms, square_footage, year_built,
                       status, rental_price, pet_policy, amenities, notes) VALUES
    -- Maple Street Apartments
    (unit_maple_1a_id, org_id, building_maple_id, '123 Maple Street', '1A', 'Austin', 'TX', '78701',
     'Apartment', 2, 1, 850, 1955, 'occupied', 1500.00, 'Cats allowed, $25/mo pet rent',
     ARRAY['Central AC', 'Dishwasher', 'Parking'], 'Corner unit with extra windows'),
    (unit_maple_1b_id, org_id, building_maple_id, '123 Maple Street', '1B', 'Austin', 'TX', '78701',
     'Apartment', 1, 1, 650, 1955, 'occupied', 1200.00, 'No pets',
     ARRAY['Central AC', 'Parking'], 'Smaller but efficient layout'),

    -- Oak Court Duplex
    (unit_oak_a_id, org_id, building_oak_id, '456 Oak Court', 'A', 'Austin', 'TX', '78702',
     'Duplex', 3, 2, 1400, 1978, 'occupied', 1800.00, 'Dogs under 30lbs, $35/mo pet rent',
     ARRAY['Central AC', 'Washer/Dryer', 'Fenced Yard', 'Garage'], 'Front unit with private yard'),
    (unit_oak_b_id, org_id, building_oak_id, '456 Oak Court', 'B', 'Austin', 'TX', '78702',
     'Duplex', 2, 1, 1100, 1978, 'vacant', 1400.00, 'Dogs under 30lbs, $35/mo pet rent',
     ARRAY['Central AC', 'Washer/Dryer', 'Shared Yard'], 'Recently renovated kitchen'),

    -- Standalone Unit
    (unit_pine_id, org_id, NULL, '789 Pine Lane', NULL, 'Austin', 'TX', '78703',
     'Single Family Home', 4, 2, 2200, 2005, 'occupied', 2200.00, 'Pets negotiable',
     ARRAY['Central AC', 'Washer/Dryer', 'Large Yard', '2-Car Garage', 'Pool'], 'Premium property in good neighborhood')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- BUILDING UNIT ALLOCATIONS (50/50 split for shared expenses)
    -- ============================================================================
    INSERT INTO building_unit_allocations (building_id, unit_id, allocation_percentage) VALUES
    (building_maple_id, unit_maple_1a_id, 55.00),
    (building_maple_id, unit_maple_1b_id, 45.00),
    (building_oak_id, unit_oak_a_id, 55.00),
    (building_oak_id, unit_oak_b_id, 45.00)
    ON CONFLICT (building_id, unit_id) DO NOTHING;

    -- ============================================================================
    -- TENANTS
    -- ============================================================================
    INSERT INTO tenants (id, organization_id, first_name, last_name, email, phone,
                         emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, notes) VALUES
    (tenant_john_id, org_id, 'John', 'Smith', 'john.smith@email.com', '512-555-0101',
     'Mary Smith', '512-555-0102', 'Spouse', 'Long-term tenant, always pays on time'),
    (tenant_sarah_id, org_id, 'Sarah', 'Johnson', 'sarah.j@email.com', '512-555-0201',
     'Tom Johnson', '512-555-0202', 'Brother', 'Graduate student at UT'),
    (tenant_mike_id, org_id, 'Mike', 'Williams', 'mike.w@email.com', '512-555-0301',
     'Linda Williams', '512-555-0302', 'Mother', 'Works from home, has a small dog named Max'),
    (tenant_emily_id, org_id, 'Emily', 'Davis', 'emily.davis@email.com', '512-555-0401',
     'James Davis', '512-555-0402', 'Father', 'Young professional, excellent credit'),
    (tenant_robert_id, org_id, 'Robert', 'Brown', 'robert.b@email.com', '512-555-0501',
     'Susan Brown', '512-555-0502', 'Sister', 'Former tenant - moved out Jan 2024')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- LEASES
    -- ============================================================================
    INSERT INTO leases (id, organization_id, unit_id, tenant_id, start_date, end_date,
                        rent_amount, security_deposit, status, terms, notes) VALUES
    -- Active leases
    (lease_john_id, org_id, unit_maple_1a_id, tenant_john_id, '2024-01-01', '2025-12-31',
     1500.00, 1500.00, 'active', 'Standard 2-year lease with renewal option', 'Renewed from previous lease'),
    (lease_sarah_id, org_id, unit_maple_1b_id, tenant_sarah_id, '2024-08-01', '2025-07-31',
     1200.00, 1200.00, 'active', 'Standard 1-year lease', 'Academic year lease'),
    (lease_mike_id, org_id, unit_oak_a_id, tenant_mike_id, '2024-03-01', '2025-02-28',
     1800.00, 1800.00, 'active', 'Standard 1-year lease. Pet addendum for dog.', 'Includes pet agreement'),
    (lease_emily_id, org_id, unit_pine_id, tenant_emily_id, '2024-06-01', '2025-05-31',
     2200.00, 2200.00, 'active', 'Standard 1-year lease with lawn care included', 'Premium tenant, references excellent'),
    -- Expired lease (for history)
    (lease_robert_id, org_id, unit_oak_b_id, tenant_robert_id, '2023-02-01', '2024-01-31',
     1350.00, 1350.00, 'expired', 'Standard 1-year lease', 'Tenant moved out on time, deposit returned in full')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- CONTRACTORS
    -- ============================================================================
    INSERT INTO contractors (id, organization_id, name, email, phone, address,
                             service_types, hourly_rate, notes) VALUES
    (contractor_plumber_id, org_id, 'Quick Fix Plumbing', 'service@quickfixplumbing.com', '512-555-1001',
     '100 Commerce Dr, Austin, TX 78745', ARRAY['plumbing', 'general_maintenance'], 85.00,
     'Reliable, usually available same day. Licensed and insured.'),
    (contractor_electric_id, org_id, 'Spark Electric Services', 'info@sparkelectric.com', '512-555-2001',
     '200 Industrial Blvd, Austin, TX 78744', ARRAY['electrical', 'hvac'], 95.00,
     'Master electrician, also handles HVAC. 24/7 emergency service.'),
    (contractor_landscape_id, org_id, 'Green Thumb Landscaping', 'hello@greenthumbatx.com', '512-555-3001',
     '300 Garden Way, Austin, TX 78748', ARRAY['landscaping', 'cleaning'], 45.00,
     'Handles lawn care and property cleanup. Weekly service available.')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- TASKS
    -- ============================================================================
    INSERT INTO tasks (id, organization_id, unit_id, title, description, status, priority,
                       due_date, assigned_contractor_id, estimated_cost, actual_cost, notes) VALUES
    -- Open task - assigned to plumber
    (task_faucet_id, org_id, unit_maple_1a_id, 'Fix leaky kitchen faucet',
     'Tenant reported dripping from kitchen faucet. Washer likely needs replacement.',
     'open', 'medium', CURRENT_DATE + 7, contractor_plumber_id, 150.00, NULL,
     'Tenant prefers afternoon appointments'),

    -- In progress task
    (task_hvac_id, org_id, unit_oak_a_id, 'Annual HVAC inspection and service',
     'Scheduled annual maintenance. Check filters, refrigerant levels, clean coils.',
     'in_progress', 'medium', CURRENT_DATE + 3, contractor_electric_id, 200.00, NULL,
     'Technician started inspection this morning'),

    -- Completed task
    (task_paint_id, org_id, unit_maple_1b_id, 'Touch up paint in hallway',
     'Scuff marks on hallway walls need touch up.',
     'completed', 'low', CURRENT_DATE - 14, NULL, 75.00, 65.00,
     'Completed by maintenance staff'),

    -- Urgent open task
    (task_water_heater_id, org_id, unit_pine_id, 'Water heater replacement',
     'Water heater is 18 years old and showing signs of rust. Proactive replacement recommended before failure.',
     'open', 'urgent', CURRENT_DATE + 2, contractor_plumber_id, 1800.00, NULL,
     'Tenant aware and available for installation'),

    -- Open task for building
    (task_gutter_id, org_id, unit_maple_1a_id, 'Clean gutters - entire building',
     'Fall leaf cleanup needed for both units in building.',
     'open', 'low', CURRENT_DATE + 30, contractor_landscape_id, 250.00, NULL,
     'Schedule after first freeze'),

    -- Cancelled task
    (task_window_id, org_id, unit_oak_b_id, 'Replace cracked window',
     'Small crack in bedroom window.',
     'cancelled', 'medium', CURRENT_DATE - 7, NULL, 300.00, NULL,
     'Cancelled - tenant moved out, will address during turnover')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- RECURRING TASKS
    -- ============================================================================
    INSERT INTO recurring_tasks (organization_id, unit_id, title, description, priority,
                                 interval_days, next_due_date, assigned_contractor_id, is_active) VALUES
    (org_id, unit_pine_id, 'Monthly lawn care', 'Mow, edge, and blow. Check sprinkler system.',
     'medium', 30, CURRENT_DATE + 15, contractor_landscape_id, true),
    (org_id, unit_oak_a_id, 'HVAC filter replacement', 'Replace air filters in all returns.',
     'low', 90, CURRENT_DATE + 45, NULL, true)
    ON CONFLICT DO NOTHING;

    -- ============================================================================
    -- ASSETS
    -- ============================================================================
    INSERT INTO assets (id, organization_id, unit_id, name, asset_type, make, model,
                        serial_number, purchase_date, purchase_price, warranty_expiry,
                        expected_lifespan_years, condition, notes) VALUES
    -- Maple 1A
    (asset_fridge_maple_1a_id, org_id, unit_maple_1a_id, 'Kitchen Refrigerator', 'refrigerator',
     'Samsung', 'RF28R7351SR', 'SN-RF2024001', '2022-03-15', 1899.00, '2025-03-15',
     15, 'excellent', 'French door, stainless steel'),
    (asset_hvac_maple_1a_id, org_id, unit_maple_1a_id, 'Central AC Unit', 'hvac',
     'Carrier', '24ACC636A003', 'SN-AC2019001', '2019-06-01', 4500.00, '2029-06-01',
     15, 'good', '3-ton unit, serviced annually'),

    -- Maple 1B
    (asset_fridge_maple_1b_id, org_id, unit_maple_1b_id, 'Kitchen Refrigerator', 'refrigerator',
     'GE', 'GTE18GMHES', 'SN-GE2020001', '2020-08-10', 699.00, '2023-08-10',
     12, 'good', 'Top freezer model, warranty expired'),

    -- Oak Court A
    (asset_hvac_oak_a_id, org_id, unit_oak_a_id, 'Central AC/Heat Pump', 'hvac',
     'Trane', 'XR15', 'SN-TR2021001', '2021-04-20', 6200.00, '2031-04-20',
     18, 'excellent', 'Heat pump, very efficient'),
    (asset_water_heater_oak_a_id, org_id, unit_oak_a_id, 'Tankless Water Heater', 'water_heater',
     'Rinnai', 'RU199iN', 'SN-RI2021002', '2021-04-20', 2100.00, '2033-04-20',
     20, 'excellent', 'Natural gas, installed with HVAC'),

    -- Pine Lane
    (asset_hvac_pine_id, org_id, unit_pine_id, 'Central AC System', 'hvac',
     'Lennox', 'XC21', 'SN-LX2018001', '2018-07-15', 8500.00, '2028-07-15',
     20, 'good', '5-ton, two-stage cooling'),
    (asset_water_heater_pine_id, org_id, unit_pine_id, 'Tank Water Heater', 'water_heater',
     'Rheem', 'XG50T06EC36U1', 'SN-RH2006001', '2006-05-01', 800.00, '2012-05-01',
     12, 'poor', '50 gallon, original to house - NEEDS REPLACEMENT'),
    (asset_fridge_pine_id, org_id, unit_pine_id, 'Kitchen Refrigerator', 'refrigerator',
     'LG', 'LRMVS3006S', 'SN-LG2023001', '2023-01-10', 2499.00, '2026-01-10',
     15, 'excellent', 'Side-by-side with InstaView')
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- ASSET MAINTENANCE LOGS
    -- ============================================================================
    INSERT INTO asset_maintenance_logs (organization_id, asset_id, service_date, service_type,
                                        description, cost, performed_by, contractor_id, notes) VALUES
    -- HVAC service history
    (org_id, asset_hvac_maple_1a_id, '2024-04-15', 'Annual Service',
     'Annual inspection, cleaned coils, replaced filter, checked refrigerant', 175.00,
     'Spark Electric Services', contractor_electric_id, 'All systems normal'),
    (org_id, asset_hvac_maple_1a_id, '2023-04-10', 'Annual Service',
     'Annual inspection and maintenance', 165.00,
     'Spark Electric Services', contractor_electric_id, 'Topped off refrigerant'),
    (org_id, asset_hvac_oak_a_id, '2024-03-20', 'Annual Service',
     'Heat pump annual maintenance, cleaned outdoor unit', 195.00,
     'Spark Electric Services', contractor_electric_id, 'Excellent condition'),

    -- Water heater service
    (org_id, asset_water_heater_pine_id, '2024-01-05', 'Inspection',
     'Inspected due to age concerns. Found rust at bottom, anode rod depleted.',
     0.00, 'Quick Fix Plumbing', contractor_plumber_id, 'Recommended replacement ASAP'),
    (org_id, asset_water_heater_pine_id, '2020-06-15', 'Repair',
     'Replaced thermostat and heating element', 275.00,
     'Quick Fix Plumbing', contractor_plumber_id, 'Temporary fix, discussed replacement timeline')
    ON CONFLICT DO NOTHING;

    -- ============================================================================
    -- CONTRACTOR RATINGS (for completed work)
    -- ============================================================================
    INSERT INTO contractor_ratings (organization_id, contractor_id, task_id, rating, review) VALUES
    (org_id, contractor_plumber_id, task_paint_id, 4, 'Good work, arrived on time. Slightly higher cost than quoted but fair.')
    ON CONFLICT (task_id) DO NOTHING;

    -- ============================================================================
    -- TRANSACTIONS (Get category IDs first)
    -- ============================================================================
    SELECT id INTO cat_rent_id FROM transaction_categories WHERE name = 'Rent' AND is_system_default = true LIMIT 1;
    SELECT id INTO cat_repair_id FROM transaction_categories WHERE name = 'Repairs' AND is_system_default = true LIMIT 1;
    SELECT id INTO cat_utilities_id FROM transaction_categories WHERE name = 'Utilities' AND is_system_default = true LIMIT 1;
    SELECT id INTO cat_insurance_id FROM transaction_categories WHERE name = 'Insurance' AND is_system_default = true LIMIT 1;

    -- Insert transactions
    INSERT INTO transactions (organization_id, unit_id, tenant_id, category_id, type,
                              description, transaction_date, expected_amount, actual_amount, notes) VALUES
    -- Rent payments (income)
    (org_id, unit_maple_1a_id, tenant_john_id, cat_rent_id, 'income',
     'January 2025 Rent - Unit 1A', '2025-01-01', 1500.00, 1500.00, 'Paid on time via ACH'),
    (org_id, unit_maple_1b_id, tenant_sarah_id, cat_rent_id, 'income',
     'January 2025 Rent - Unit 1B', '2025-01-01', 1200.00, 1200.00, 'Paid on time'),
    (org_id, unit_oak_a_id, tenant_mike_id, cat_rent_id, 'income',
     'January 2025 Rent - Oak Court A', '2025-01-01', 1800.00, 1800.00, 'Includes pet rent'),
    (org_id, unit_pine_id, tenant_emily_id, cat_rent_id, 'income',
     'January 2025 Rent - Pine Lane', '2025-01-01', 2200.00, 2200.00, 'Paid early'),

    -- December rent
    (org_id, unit_maple_1a_id, tenant_john_id, cat_rent_id, 'income',
     'December 2024 Rent - Unit 1A', '2024-12-01', 1500.00, 1500.00, NULL),
    (org_id, unit_maple_1b_id, tenant_sarah_id, cat_rent_id, 'income',
     'December 2024 Rent - Unit 1B', '2024-12-01', 1200.00, 1200.00, NULL),

    -- Expenses
    (org_id, unit_maple_1b_id, NULL, cat_repair_id, 'expense',
     'Hallway paint touch-up', '2024-12-20', 75.00, 65.00, 'Task #paint - completed under budget'),
    (org_id, unit_pine_id, NULL, cat_utilities_id, 'expense',
     'December Water Bill - Pine Lane', '2024-12-15', 85.00, 78.50, 'Owner-paid utility'),
    (org_id, NULL, NULL, cat_insurance_id, 'expense',
     'Annual Property Insurance - All Properties', '2024-12-01', 3600.00, 3600.00, 'Annual premium for all units')
    ON CONFLICT DO NOTHING;

    -- ============================================================================
    -- PHOTOS (metadata only - no actual files)
    -- ============================================================================
    INSERT INTO photos (organization_id, unit_id, file_path, file_name, file_size, mime_type,
                        event_type, caption, taken_at, latitude, longitude, task_id) VALUES
    -- Move-in photos
    (org_id, unit_maple_1a_id, 'unit-photos/maple-1a/move-in-living-room.jpg', 'move-in-living-room.jpg',
     2048000, 'image/jpeg', 'move_in', 'Living room at move-in - John Smith', '2024-01-01 10:30:00',
     30.2672, -97.7431, NULL),
    (org_id, unit_maple_1a_id, 'unit-photos/maple-1a/move-in-kitchen.jpg', 'move-in-kitchen.jpg',
     1856000, 'image/jpeg', 'move_in', 'Kitchen at move-in', '2024-01-01 10:35:00',
     30.2672, -97.7431, NULL),

    -- Maintenance photos
    (org_id, unit_maple_1b_id, 'unit-photos/maple-1b/hallway-before-paint.jpg', 'hallway-before-paint.jpg',
     1024000, 'image/jpeg', 'maintenance', 'Hallway before paint touch-up', '2024-12-18 14:00:00',
     30.2672, -97.7431, task_paint_id),
    (org_id, unit_maple_1b_id, 'unit-photos/maple-1b/hallway-after-paint.jpg', 'hallway-after-paint.jpg',
     1124000, 'image/jpeg', 'maintenance', 'Hallway after paint touch-up', '2024-12-20 16:00:00',
     30.2672, -97.7431, task_paint_id),

    -- Inspection photos
    (org_id, unit_pine_id, 'unit-photos/pine/water-heater-rust.jpg', 'water-heater-rust.jpg',
     1536000, 'image/jpeg', 'inspection', 'Water heater showing rust - needs replacement', '2024-01-05 11:00:00',
     30.2850, -97.7420, NULL),

    -- General property photo
    (org_id, unit_oak_a_id, 'unit-photos/oak-a/exterior-front.jpg', 'exterior-front.jpg',
     2560000, 'image/jpeg', 'general', 'Front exterior of Oak Court duplex', '2024-06-15 09:00:00',
     30.2700, -97.7380, NULL)
    ON CONFLICT DO NOTHING;

    -- ============================================================================
    -- TENANT TIMELINE EVENTS
    -- ============================================================================
    INSERT INTO tenant_timeline_events (tenant_id, event_type, title, description, event_date) VALUES
    (tenant_john_id, 'lease_signed', 'Lease renewed for 2024-2025', 'Two-year renewal signed', '2023-12-15'),
    (tenant_john_id, 'move_in', 'Original move-in', 'Initial move-in to Unit 1A', '2022-01-01'),
    (tenant_sarah_id, 'lease_signed', 'Lease signed', 'Initial 1-year lease for academic year', '2024-07-15'),
    (tenant_sarah_id, 'move_in', 'Move-in completed', 'Keys handed over, all utilities transferred', '2024-08-01'),
    (tenant_robert_id, 'move_out', 'Move-out completed', 'Final walkthrough done, deposit returned', '2024-01-31'),
    (tenant_mike_id, 'inspection', 'Pet inspection', 'Annual pet inspection - Max is well-behaved, no damage', '2024-09-15')
    ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- Success message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Test seed data created successfully!';
    RAISE NOTICE 'Organization: Acme Property Management';
    RAISE NOTICE 'Units: 5 (4 occupied, 1 vacant)';
    RAISE NOTICE 'Tenants: 5 (4 active, 1 former)';
    RAISE NOTICE 'Contractors: 3';
    RAISE NOTICE 'Tasks: 6 (various statuses)';
    RAISE NOTICE 'Assets: 8';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: You need to sign up/login to access this data.';
    RAISE NOTICE 'After signing up, run this SQL to add yourself to the org:';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO organization_members (organization_id, user_id, role)';
    RAISE NOTICE 'VALUES (''11111111-1111-1111-1111-111111111111'', auth.uid(), ''owner'');';
END $$;
