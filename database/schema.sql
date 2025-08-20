-- AI CV Improvement Platform Database Schema
-- This file contains the complete database schema for the application

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create resumes table
-- Stores information about uploaded CVs and their analysis results
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_session_id TEXT NOT NULL,
    original_pdf_path TEXT NOT NULL,
    generated_pdf_path TEXT,
    analysis_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_session_id for faster lookups
CREATE INDEX idx_resumes_user_session_id ON resumes(user_session_id);

-- Create index on created_at for time-based queries
CREATE INDEX idx_resumes_created_at ON resumes(created_at);

-- Create ai_provider_settings table
-- Stores configuration for different AI providers
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

-- Ensure only one provider can be marked as default
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

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER update_resumes_updated_at 
    BEFORE UPDATE ON resumes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_provider_settings_updated_at 
    BEFORE UPDATE ON ai_provider_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create rate_limits table for server-side rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    client_ip INET,
    user_agent TEXT,
    endpoint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_client_ip ON rate_limits(client_ip);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);

-- Create partial index for active rate limits only
CREATE INDEX IF NOT EXISTS idx_rate_limits_active 
ON rate_limits(key, expires_at) 
WHERE expires_at > NOW();

-- Create trigger to update updated_at timestamp for rate_limits
CREATE TRIGGER update_rate_limits_updated_at 
    BEFORE UPDATE ON rate_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();