-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  notes TEXT,
  photo_url TEXT,
  album_link TEXT,
  visited_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for travel photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('travel-photos', 'travel-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own locations
CREATE POLICY "Users can view their own locations" ON locations
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own locations
CREATE POLICY "Users can insert their own locations" ON locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own locations
CREATE POLICY "Users can update their own locations" ON locations
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for users to delete their own locations
CREATE POLICY "Users can delete their own locations" ON locations
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for travel-photos bucket
CREATE POLICY "Users can upload their own photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
