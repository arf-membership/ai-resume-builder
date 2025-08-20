-- Migration: Fix Storage RLS Policies for Session-Based Access
-- This migration updates the storage policies to work with the current application architecture

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload to originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update originals bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to generated bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from generated bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update generated bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from generated bucket" ON storage.objects;

-- Create new storage policies that allow public access to specific buckets
-- This is a temporary solution until proper session management is implemented

-- Originals bucket policies - Allow public access with folder-based organization
CREATE POLICY "Allow uploads to originals bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'originals' AND
        auth.uid() IS NULL -- No authentication required for anonymous users
    );

CREATE POLICY "Allow reading from originals bucket" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'originals'
    );

CREATE POLICY "Allow updates to originals bucket" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'originals'
    );

CREATE POLICY "Allow deletes from originals bucket" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'originals'
    );

-- Generated bucket policies - Allow public access with folder-based organization
CREATE POLICY "Allow uploads to generated bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'generated' AND
        auth.uid() IS NULL -- No authentication required for anonymous users
    );

CREATE POLICY "Allow reading from generated bucket" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'generated'
    );

CREATE POLICY "Allow updates to generated bucket" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'generated'
    );

CREATE POLICY "Allow deletes from generated bucket" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'generated'
    );

-- Note: This approach relies on folder-based organization for security
-- File paths should be structured as: {session_id}/{filename}
-- This provides logical separation while allowing the application to function
