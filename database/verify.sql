-- Verification script for AI CV Improvement Platform database setup
-- Run this script to verify that all components are properly configured

-- Check if tables exist
SELECT 
    'Tables Check' as category,
    CASE 
        WHEN COUNT(*) = 2 THEN 'PASS: All tables created'
        ELSE 'FAIL: Missing tables'
    END as status,
    COUNT(*) as found_tables,
    2 as expected_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('resumes', 'ai_provider_settings');

-- Check if indexes exist
SELECT 
    'Indexes Check' as category,
    CASE 
        WHEN COUNT(*) >= 3 THEN 'PASS: Required indexes created'
        ELSE 'FAIL: Missing indexes'
    END as status,
    COUNT(*) as found_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('resumes', 'ai_provider_settings');

-- Check if storage buckets exist
SELECT 
    'Storage Buckets Check' as category,
    CASE 
        WHEN COUNT(*) = 2 THEN 'PASS: All buckets created'
        ELSE 'FAIL: Missing buckets'
    END as status,
    COUNT(*) as found_buckets,
    2 as expected_buckets
FROM storage.buckets 
WHERE id IN ('originals', 'generated');

-- Check if AI providers are configured
SELECT 
    'AI Providers Check' as category,
    CASE 
        WHEN COUNT(*) >= 1 THEN 'PASS: AI providers configured'
        ELSE 'FAIL: No AI providers found'
    END as status,
    COUNT(*) as configured_providers
FROM ai_provider_settings 
WHERE is_active = true;

-- Check if RLS is enabled
SELECT 
    'RLS Check' as category,
    CASE 
        WHEN COUNT(*) = 2 THEN 'PASS: RLS enabled on all tables'
        ELSE 'FAIL: RLS not properly configured'
    END as status,
    COUNT(*) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('resumes', 'ai_provider_settings')
AND rowsecurity = true;

-- Check if policies exist
SELECT 
    'Policies Check' as category,
    CASE 
        WHEN COUNT(*) >= 5 THEN 'PASS: Required policies created'
        ELSE 'FAIL: Missing policies'
    END as status,
    COUNT(*) as found_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('resumes', 'ai_provider_settings');

-- Check storage policies
SELECT 
    'Storage Policies Check' as category,
    CASE 
        WHEN COUNT(*) >= 8 THEN 'PASS: Storage policies configured'
        ELSE 'FAIL: Missing storage policies'
    END as status,
    COUNT(*) as storage_policies
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Check if functions exist
SELECT 
    'Functions Check' as category,
    CASE 
        WHEN COUNT(*) >= 1 THEN 'PASS: Required functions created'
        ELSE 'FAIL: Missing functions'
    END as status,
    COUNT(*) as found_functions
FROM pg_proc 
WHERE proname = 'update_updated_at_column';

-- Check if triggers exist
SELECT 
    'Triggers Check' as category,
    CASE 
        WHEN COUNT(*) = 2 THEN 'PASS: All triggers created'
        ELSE 'FAIL: Missing triggers'
    END as status,
    COUNT(*) as found_triggers
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table IN ('resumes', 'ai_provider_settings')
AND trigger_name LIKE '%updated_at%';

-- Summary
SELECT 
    '=== SETUP SUMMARY ===' as summary,
    '' as details;

-- List all tables with their row counts
SELECT 
    'Table: ' || table_name as summary,
    'Rows: ' || (
        SELECT COUNT(*) 
        FROM information_schema.tables t2 
        WHERE t2.table_name = t1.table_name 
        AND t2.table_schema = 'public'
    )::text as details
FROM information_schema.tables t1
WHERE table_schema = 'public' 
AND table_name IN ('resumes', 'ai_provider_settings');

-- List storage buckets with their settings
SELECT 
    'Bucket: ' || name as summary,
    'Size Limit: ' || (file_size_limit / 1024 / 1024)::text || 'MB, Public: ' || public::text as details
FROM storage.buckets 
WHERE id IN ('originals', 'generated');

-- List configured AI providers
SELECT 
    'AI Provider: ' || provider_name as summary,
    'Default: ' || is_default::text || ', Active: ' || is_active::text as details
FROM ai_provider_settings
ORDER BY is_default DESC, provider_name;