ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

UPDATE locations 
SET category = 'general' 
WHERE category IS NULL;
