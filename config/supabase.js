import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage adapter that works on both web and native platforms
// Web uses localStorage, native uses SecureStore
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    // Web: Use localStorage
    return {
      getItem: async (key) => {
        return localStorage.getItem(key);
      },
      setItem: async (key, value) => {
        return localStorage.setItem(key, value);
      },
      removeItem: async (key) => {
        return localStorage.removeItem(key);
      },
    };
  } else {
    // Native (iOS/Android): Use SecureStore
    return {
      getItem: async (key) => {
        return SecureStore.getItemAsync(key);
      },
      setItem: async (key, value) => {
        return SecureStore.setItemAsync(key, value);
      },
      removeItem: async (key) => {
        return SecureStore.deleteItemAsync(key);
      },
    };
  }
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
  console.error(
    'Missing Supabase URL. Please set EXPO_PUBLIC_SUPABASE_URL in your .env file'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error(
    'Missing Supabase Anon Key. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file'
  );
}

// Create Supabase client with platform-specific storage
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: createStorageAdapter(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
