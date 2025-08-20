-- Migration: Add set_config function for RLS policies
-- This function allows the application to set session variables for RLS policies

-- Function to set configuration variables for RLS policies
CREATE OR REPLACE FUNCTION public.set_config(
    setting_name TEXT,
    setting_value TEXT,
    is_local BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
SECURITY DEFINER
AS $$
BEGIN
    -- Use PostgreSQL's built-in set_config function
    RETURN pg_catalog.set_config(setting_name, setting_value, is_local);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, TEXT, BOOLEAN) TO authenticated;
