-- Add geolocation columns to units table for GPS-based auto-navigation
-- This enables the mobile app to detect when users are physically at a property

-- Add latitude and longitude columns
ALTER TABLE units ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE units ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create index for location-based queries (only on rows with coordinates)
CREATE INDEX IF NOT EXISTS idx_units_location ON units(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN units.latitude IS 'GPS latitude coordinate for the unit address, used for mobile app auto-navigation';
COMMENT ON COLUMN units.longitude IS 'GPS longitude coordinate for the unit address, used for mobile app auto-navigation';
