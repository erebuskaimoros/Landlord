-- Landlord Property Management SaaS - Default Transaction Categories
-- IRS Schedule E aligned categories

-- ============================================================================
-- INCOME CATEGORIES
-- ============================================================================
INSERT INTO transaction_categories (name, type, is_system_default, schedule_e_line) VALUES
    ('Rent', 'income', true, 'Line 3'),
    ('Late Fees', 'income', true, 'Line 3'),
    ('Pet Fees', 'income', true, 'Line 3'),
    ('Parking', 'income', true, 'Line 3'),
    ('Utilities Reimbursement', 'income', true, 'Line 3'),
    ('Other Income', 'income', true, 'Line 3');

-- ============================================================================
-- EXPENSE CATEGORIES (IRS Schedule E Lines)
-- ============================================================================
INSERT INTO transaction_categories (name, type, is_system_default, schedule_e_line) VALUES
    ('Advertising', 'expense', true, 'Line 5'),
    ('Auto and Travel', 'expense', true, 'Line 6'),
    ('Cleaning and Maintenance', 'expense', true, 'Line 7'),
    ('Commissions', 'expense', true, 'Line 8'),
    ('Insurance', 'expense', true, 'Line 9'),
    ('Legal and Professional Fees', 'expense', true, 'Line 10'),
    ('Management Fees', 'expense', true, 'Line 11'),
    ('Mortgage Interest', 'expense', true, 'Line 12'),
    ('Other Interest', 'expense', true, 'Line 13'),
    ('Repairs', 'expense', true, 'Line 14'),
    ('Supplies', 'expense', true, 'Line 15'),
    ('Taxes', 'expense', true, 'Line 16'),
    ('Utilities', 'expense', true, 'Line 17'),
    ('Depreciation', 'expense', true, 'Line 18'),
    ('Other', 'expense', true, 'Line 19');
