-- AI CV Improvement Platform Row Level Security Policies
-- This file contains all RLS policies for data access control

-- Enable Row Level Security on tables
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Resumes table policies
-- Since we don't have user authentication, we'll use session-based access control

-- Policy: Allow users to read their own resumes based on session ID
CREATE POLICY "Users can read their own resumes" ON resumes
    FOR SELECT
    USING (
        user_session_id = current_setting('app.current_session_id', true)
    );

-- Policy: Allow users to insert resumes with their session ID
CREATE POLICY "Users can insert their own resumes" ON resumes
    FOR INSERT
    WITH CHECK (
        user_session_id = current_setting('app.current_session_id', true)
    );

-- Policy: Allow users to update their own resumes
CREATE POLICY "Users can update their own resumes" ON resumes
    FOR UPDATE
    USING (
        user_session_id = current_setting('app.current_session_id', true)
    )
    WITH CHECK (
        user_session_id = current_setting('app.current_session_id', true)
    );

-- Policy: Allow users to delete their own resumes (for cleanup)
CREATE POLICY "Users can delete their own resumes" ON resumes
    FOR DELETE
    USING (
        user_session_id = current_setting('app.current_session_id', true)
    );

-- AI Provider Settings policies
-- These should be read-only for the application, managed by administrators

-- Policy: Allow reading active AI provider settings
CREATE POLICY "Allow reading active AI provider settings" ON ai_provider_settings
    FOR SELECT
    USING (is_active = true);

-- Storage policies for buckets

-- Originals bucket policies
CREATE POLICY "Users can upload to originals bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'originals' AND
        auth.uid() IS NULL AND -- No authentication required
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

-- Generated bucket policies
CREATE POLICY "Users can upload to generated bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'generated' AND
        auth.uid() IS NULL AND -- No authentication required
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