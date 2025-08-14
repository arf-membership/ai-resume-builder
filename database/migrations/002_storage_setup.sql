-- Migration: Storage buckets and policies setup
-- Created: 2025-01-14
-- Description: Creates storage buckets and RLS policies for file management

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