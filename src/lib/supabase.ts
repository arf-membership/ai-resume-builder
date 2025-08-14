// Supabase client configuration for AI CV Improvement Platform
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create Supabase client with TypeScript support
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable auth since we're using session-based tracking
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Session management utilities
export const setSessionId = (sessionId: string) => {
  // Set the session ID in Supabase client for RLS policies
  return supabase.rpc('set_config', {
    setting_name: 'app.current_session_id',
    setting_value: sessionId,
    is_local: true,
  });
};

export const generateSessionId = (): string => {
  // Generate a unique session ID
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Storage bucket names
export const STORAGE_BUCKETS = {
  ORIGINALS: 'originals',
  GENERATED: 'generated',
} as const;

// Helper function to get file path with session ID
export const getSessionFilePath = (sessionId: string, filename: string): string => {
  return `${sessionId}/${filename}`;
};

// Helper function to get public URL for a file
export const getFileUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to upload file with session-based path
export const uploadFile = async (
  bucket: string,
  sessionId: string,
  file: File,
  filename?: string
) => {
  const fileName = filename || file.name;
  const filePath = getSessionFilePath(sessionId, fileName);
  
  return supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
};

// Helper function to download file
export const downloadFile = async (bucket: string, path: string) => {
  return supabase.storage.from(bucket).download(path);
};

// Helper function to delete file
export const deleteFile = async (bucket: string, path: string) => {
  return supabase.storage.from(bucket).remove([path]);
};

export default supabase;