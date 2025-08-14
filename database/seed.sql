-- AI CV Improvement Platform Seed Data
-- This file contains initial data for the application

-- Insert default AI provider settings
-- Note: API keys should be stored in Supabase Secrets, not in the database directly

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

-- Additional AI providers can be added here
-- Example for Claude (Anthropic)
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