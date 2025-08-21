# Fixing Supabase Storage Bucket Access

## Issue
Your storage buckets are set to private (`public: false`), which causes "Bucket not found" errors when trying to get public URLs.

## Solution Options

### Option 1: Make Buckets Public (Recommended for hackathon)
1. Go to your Supabase Dashboard
2. Navigate to Storage > Settings
3. For both `originals` and `generated` buckets:
   - Click the bucket name
   - Go to Settings
   - Enable "Public bucket"
   - Save changes

### Option 2: Use Signed URLs (Already implemented)
The code has been updated to use signed URLs which work with private buckets:
- `getFileUrl()` now returns signed URLs with 1-hour expiry
- This works with private buckets but URLs expire

### Option 3: Manual SQL Update (if you have direct database access)
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name IN ('originals', 'generated');
```

## Verification
After making buckets public, the CV preview should work without the "Bucket not found" error.

## Security Note
For production, consider keeping buckets private and using signed URLs with proper authentication.
