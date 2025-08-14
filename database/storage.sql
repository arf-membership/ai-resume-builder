-- AI CV Improvement Platform Storage Configuration
-- This file contains the storage bucket setup and policies

-- Create storage buckets for PDF files
-- Note: These commands should be run in the Supabase dashboard or via the Supabase CLI

-- Create bucket for original PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'originals',
    'originals',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for generated/improved PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'generated',
    'generated',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies will be defined in rls.sql for better organization