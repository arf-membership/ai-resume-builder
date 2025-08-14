-- Migration: Initial schema for AI CV Improvement Platform
-- Created: 2025-01-14
-- Description: Creates the initial database schema with tables, indexes, RLS policies, and storage buckets

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_session_id TEXT NOT NULL,
    original_pdf_path TEXT NOT NULL,
    generated_pdf_path TEXT,
    analysis_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_resumes_user_session_id ON resumes(user_session_id);
CREATE INDEX idx_resumes_created_at ON resumes(created_at);

-- Create ai_provider_settings table
CREATE TABLE ai_provider_settings (
    id SERIAL PRIMARY KEY,
    provider_name TEXT UNIQUE NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key_secret_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one provider can be default
CREATE UNIQUE INDEX idx_ai_provider_settings_default 
ON ai_provider_settings(is_default) 
WHERE is_default = TRUE;

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_resumes_updated_at 
    BEFORE UPDATE ON resumes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_provider_settings_updated_at 
    BEFORE UPDATE ON ai_provider_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for resumes table
CREATE POLICY "Users can read their own resumes" ON resumes
    FOR SELECT
    USING (user_session_id = current_setting('app.current_session_id', true));

CREATE POLICY "Users can insert their own resumes" ON resumes
    FOR INSERT
    WITH CHECK (user_session_id = current_setting('app.current_session_id', true));

CREATE POLICY "Users can update their own resumes" ON resumes
    FOR UPDATE
    USING (user_session_id = current_setting('app.current_session_id', true))
    WITH CHECK (user_session_id = current_setting('app.current_session_id', true));

CREATE POLICY "Users can delete their own resumes" ON resumes
    FOR DELETE
    USING (user_session_id = current_setting('app.current_session_id', true));

-- Create RLS policy for AI provider settings
CREATE POLICY "Allow reading active AI provider settings" ON ai_provider_settings
    FOR SELECT
    USING (is_active = true);

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
);

-- Insert additional provider (disabled by default)
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
);