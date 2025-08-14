-- AI CV Improvement Platform Database Deployment Script
-- Run this file to set up the complete database schema and configuration

-- This script combines all the individual SQL files for easy deployment
-- Run in Supabase SQL Editor or via Supabase CLI

BEGIN;

-- 1. Schema Setup
-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_session_id TEXT NOT NULL,
    original_pdf_path TEXT NOT NULL,
    generated_pdf_path TEXT,
    analysis_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resumes_user_session_id ON resumes(user_session_id);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at);

-- Create ai_provider_settings table
CREATE TABLE IF NOT EXISTS ai_provider_settings (
    id SERIAL PRIMARY KEY,
    provider_name TEXT UNIQUE NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key_secret_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one provider can be marked as default
DROP INDEX IF EXISTS idx_ai_provider_settings_default;
CREATE UNIQUE INDEX idx_ai_provider_settings_default 
ON ai_provider_settings(is_default) 
WHERE is_default = TRUE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_resumes_updated_at ON resumes;
CREATE TRIGGER update_resumes_updated_at 
    BEFORE UPDATE ON resumes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_provider_settings_updated_at ON ai_provider_settings;
CREATE TRIGGER update_ai_provider_settings_updated_at 
    BEFORE UPDATE ON ai_provider_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Storage Setup
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'originals',
    'originals',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'generated',
    'generated',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security Setup
-- Enable RLS
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can insert their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON resumes;
DROP POLICY IF EXISTS "Allow reading active AI provider settings" ON ai_provider_settings;

-- Create resumes policies
CREATE POLICY "Users can read their own resumes" ON resumes
    FOR SELECT
    USING (
        user_session_id = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can insert their own resumes" ON resumes
    FOR INSERT
    WITH CHECK (
        user_session_id = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can update their own resumes" ON resumes
    FOR UPDATE
    USING (
        user_session_id = current_setting('app.current_session_id', true)
    )
    WITH CHECK (
        user_session_id = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can delete their own resumes" ON resumes
    FOR DELETE
    USING (
        user_session_id = current_setting('app.current_session_id', true)
    );

-- Create AI provider settings policies
CREATE POLICY "Allow reading active AI provider settings" ON ai_provider_settings
    FOR SELECT
    USING (is_active = true);

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload to originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update originals bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to generated bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from generated bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update generated bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from generated bucket" ON storage.objects;

-- Create storage policies for originals bucket
CREATE POLICY "Users can upload to originals bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'originals' AND
        auth.uid() IS NULL AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can read from originals bucket" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'originals' AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can update originals bucket objects" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'originals' AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can delete from originals bucket" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'originals' AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

-- Create storage policies for generated bucket
CREATE POLICY "Users can upload to generated bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'generated' AND
        auth.uid() IS NULL AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can read from generated bucket" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'generated' AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can update generated bucket objects" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'generated' AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

CREATE POLICY "Users can delete from generated bucket" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'generated' AND
        (storage.foldername(name))[1] = current_setting('app.current_session_id', true)
    );

-- 4. Seed Data
-- Insert default AI provider settings
INSERT INTO ai_provider_settings (
    provider_name,
    api_endpoint,
    api_key_secret_name,
    is_default,
    is_active
) VALUES (
    'openai',
    'https://api.openai.com/v1',
    'OPENAI_API_KEY',
    true,
    true
) ON CONFLICT (provider_name) DO UPDATE SET
    api_endpoint = EXCLUDED.api_endpoint,
    api_key_secret_name = EXCLUDED.api_key_secret_name,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO ai_provider_settings (
    provider_name,
    api_endpoint,
    api_key_secret_name,
    is_default,
    is_active
) VALUES (
    'anthropic',
    'https://api.anthropic.com/v1',
    'ANTHROPIC_API_KEY',
    false,
    false
) ON CONFLICT (provider_name) DO UPDATE SET
    api_endpoint = EXCLUDED.api_endpoint,
    api_key_secret_name = EXCLUDED.api_key_secret_name,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

COMMIT;

-- Verify the setup
SELECT 'Database setup completed successfully!' as status;
SELECT 'Tables created:' as info, count(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('resumes', 'ai_provider_settings');

SELECT 'Storage buckets created:' as info, count(*) as bucket_count 
FROM storage.buckets 
WHERE id IN ('originals', 'generated');

SELECT 'AI providers configured:' as info, count(*) as provider_count 
FROM ai_provider_settings;