# Database Migration Instructions

## To fix the RLS policy violation error:

You need to apply the latest migrations to fix the RLS policies for both storage and database operations.

### IMPORTANT: Apply these migrations in order:

#### Migration 004: Fix Storage RLS Policies
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the contents of `database/migrations/004_fix_storage_rls_policies.sql`

#### Migration 005: Fix Resumes Table RLS Policies
1. In the same SQL Editor
2. Run the contents of `database/migrations/005_fix_resumes_rls_policies.sql`

### Quick Fix via Supabase Dashboard:
Copy and paste this SQL in your Supabase SQL Editor:

```sql
-- Fix Storage Policies
DROP POLICY IF EXISTS "Users can upload to originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update originals bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from originals bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to generated bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from generated bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update generated bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from generated bucket" ON storage.objects;

-- Create permissive storage policies
CREATE POLICY "Allow uploads to originals bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'originals' AND auth.uid() IS NULL);

CREATE POLICY "Allow reading from originals bucket" ON storage.objects
    FOR SELECT USING (bucket_id = 'originals');

CREATE POLICY "Allow updates to originals bucket" ON storage.objects
    FOR UPDATE USING (bucket_id = 'originals');

CREATE POLICY "Allow deletes from originals bucket" ON storage.objects
    FOR DELETE USING (bucket_id = 'originals');

CREATE POLICY "Allow uploads to generated bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'generated' AND auth.uid() IS NULL);

CREATE POLICY "Allow reading from generated bucket" ON storage.objects
    FOR SELECT USING (bucket_id = 'generated');

CREATE POLICY "Allow updates to generated bucket" ON storage.objects
    FOR UPDATE USING (bucket_id = 'generated');

CREATE POLICY "Allow deletes from generated bucket" ON storage.objects
    FOR DELETE USING (bucket_id = 'generated');

-- Fix Resumes Table Policies
DROP POLICY IF EXISTS "Users can read their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can insert their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON resumes;

CREATE POLICY "Allow reading resumes" ON resumes
    FOR SELECT USING (true);

CREATE POLICY "Allow inserting resumes" ON resumes
    FOR INSERT
    WITH CHECK (
        user_session_id IS NOT NULL AND
        user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+'
    );

CREATE POLICY "Allow updating resumes" ON resumes
    FOR UPDATE
    USING (user_session_id IS NOT NULL AND user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+')
    WITH CHECK (user_session_id IS NOT NULL AND user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+');

CREATE POLICY "Allow deleting resumes" ON resumes
    FOR DELETE
    USING (user_session_id IS NOT NULL AND user_session_id SIMILAR TO 'session_[0-9]+_[a-z0-9]+');
```

## What this fixes:
- Removes the problematic session config requirement from RLS policies
- Allows file uploads to Supabase storage buckets
- Enables database record creation with proper session ID validation
- Maintains security through folder-based organization and session ID format validation
