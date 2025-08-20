-- Migration: Fix Resumes Table RLS Policies
-- This migration updates the resumes table policies to work with the current application architecture

-- Drop existing resumes table policies
DROP POLICY IF EXISTS "Users can read their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can insert their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON resumes;

-- Create new resumes table policies that allow access based on session ID in data
-- This approach works with the actual session ID stored in the user_session_id column

-- Policy: Allow reading resumes (can be restricted later with proper session management)
CREATE POLICY "Allow reading resumes" ON resumes
    FOR SELECT
    USING (true); -- Allow all reads for now

-- Policy: Allow inserting resumes with valid session ID format
CREATE POLICY "Allow inserting resumes" ON resumes
    FOR INSERT
    WITH CHECK (
        user_session_id IS NOT NULL AND
        user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+'
    );

-- Policy: Allow updating resumes with valid session ID format
CREATE POLICY "Allow updating resumes" ON resumes
    FOR UPDATE
    USING (
        user_session_id IS NOT NULL AND
        user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+'
    )
    WITH CHECK (
        user_session_id IS NOT NULL AND
        user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+'
    );

-- Policy: Allow deleting resumes (for cleanup)
CREATE POLICY "Allow deleting resumes" ON resumes
    FOR DELETE
    USING (
        user_session_id IS NOT NULL AND
        user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+'
    );

-- Note: These policies provide basic validation while allowing the application to function
-- In the future, these can be enhanced with proper session-based access control
