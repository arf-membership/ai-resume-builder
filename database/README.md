# Database Setup for AI CV Improvement Platform

This directory contains all the SQL scripts needed to set up the Supabase database schema and storage for the AI CV Improvement Platform.

## Files Overview

- `schema.sql` - Main database schema with tables and indexes
- `storage.sql` - Storage bucket configuration
- `rls.sql` - Row Level Security policies for data access control
- `seed.sql` - Initial data and default AI provider settings

## Setup Instructions

### 1. Database Schema Setup

Run the schema file to create the main tables:

```sql
-- Run in Supabase SQL Editor
\i schema.sql
```

### 2. Storage Buckets Setup

Create the storage buckets for PDF files:

```sql
-- Run in Supabase SQL Editor
\i storage.sql
```

### 3. Row Level Security Setup

Configure RLS policies for secure data access:

```sql
-- Run in Supabase SQL Editor
\i rls.sql
```

### 4. Seed Data

Insert default AI provider settings:

```sql
-- Run in Supabase SQL Editor
\i seed.sql
```

## Database Schema Details

### Tables

#### `resumes`

- Stores uploaded CV information and analysis results
- Uses UUID for primary key
- Tracks session ID for user association (no auth required)
- Stores analysis results as JSONB for flexibility

#### `ai_provider_settings`

- Manages multiple AI provider configurations
- Ensures only one default provider
- References API keys stored in Supabase Secrets

### Storage Buckets

#### `originals`

- Stores original uploaded PDF files
- 10MB file size limit
- Only accepts PDF mime type
- Private bucket with session-based access

#### `generated`

- Stores AI-improved PDF files
- 10MB file size limit
- Only accepts PDF mime type
- Private bucket with session-based access

### Security Features

- **Row Level Security**: Enabled on all tables
- **Session-based Access**: Uses `app.current_session_id` setting
- **Storage Policies**: Folder-based access control using session ID
- **File Type Restrictions**: Only PDF files allowed in storage buckets
- **Size Limits**: 10MB maximum file size for uploads

## Usage Notes

1. **Session Management**: The application uses `current_setting('app.current_session_id', true)` to identify users without authentication
2. **API Keys**: Store AI provider API keys in Supabase Secrets, not in the database
3. **File Organization**: Files are organized in storage buckets using session ID as folder structure
4. **Cleanup**: Consider implementing cleanup policies for old sessions and files

## Environment Variables

Make sure to set up the following secrets in Supabase:

- `OPENAI_API_KEY` - OpenAI API key for CV analysis
- `ANTHROPIC_API_KEY` - Anthropic API key (if using Claude)

## Maintenance

- Monitor storage usage and implement cleanup for old files
- Review and update AI provider settings as needed
- Consider adding indexes for performance optimization as the application scales
