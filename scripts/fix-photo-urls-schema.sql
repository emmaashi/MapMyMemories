-- First, let's properly add the photo_urls column as an array
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Remove the old photo_url column if it exists
ALTER TABLE locations 
DROP COLUMN IF EXISTS photo_url;

-- Update any existing data (this is safe to run even if no data exists)
-- If you had any existing photo_url data, this would migrate it to the array format
-- UPDATE locations 
-- SET photo_urls = ARRAY[photo_url] 
-- WHERE photo_url IS NOT NULL AND photo_urls IS NULL;
