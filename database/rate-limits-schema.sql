-- Rate Limits Table Schema
-- This table stores rate limiting data for API endpoints
-- Requirements: 9.1, 9.2

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

-- Create composite index for efficient rate limit lookups
-- Note: We don't use a partial index with NOW() as it's not immutable
CREATE INDEX IF NOT EXISTS idx_rate_limits_active 
ON rate_limits(key, expires_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_rate_limits_updated_at 
    BEFORE UPDATE ON rate_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage rate limits
CREATE POLICY "Service role can manage rate limits" ON rate_limits
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limits 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired entries (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT cleanup_expired_rate_limits();');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits() TO service_role;