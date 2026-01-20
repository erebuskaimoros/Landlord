-- Add geolocation fields to photos table for mobile app photo capture
-- This allows storing the GPS coordinates where property photos were taken

ALTER TABLE photos ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Index for potential location-based queries (only on photos that have location data)
CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN photos.latitude IS 'GPS latitude where the photo was taken (from mobile device)';
COMMENT ON COLUMN photos.longitude IS 'GPS longitude where the photo was taken (from mobile device)';
