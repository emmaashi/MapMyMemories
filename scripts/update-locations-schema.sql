-- Update locations table to support multiple photos
ALTER TABLE locations 
DROP COLUMN IF EXISTS photo_url,
ADD COLUMN photo_urls TEXT[];

-- Update existing data (if any) to use the new array format
-- This is safe to run even if there's no existing data
UPDATE locations 
SET photo_urls = ARRAY[photo_url] 
WHERE photo_url IS NOT NULL AND photo_urls IS NULL;
