import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const authDirectory = `${FileSystem.documentDirectory ?? ''}supabase-auth/`;

function getAuthFile(key: string) {
  return `${authDirectory}${encodeURIComponent(key)}.json`;
}

const nativeStorage = {
  getItem: async (key: string) => {
    if (!authDirectory) return null;

    try {
      const file = getAuthFile(key);
      const info = await FileSystem.getInfoAsync(file);
      return info.exists ? await FileSystem.readAsStringAsync(file) : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (!authDirectory) return;

    try {
      await FileSystem.makeDirectoryAsync(authDirectory, { intermediates: true });
      await FileSystem.writeAsStringAsync(getAuthFile(key), value);
    } catch {
      // Auth can still continue in memory if device storage is unavailable.
    }
  },
  removeItem: async (key: string) => {
    if (!authDirectory) return;

    try {
      const file = getAuthFile(key);
      const info = await FileSystem.getInfoAsync(file);

      if (info.exists) {
        await FileSystem.deleteAsync(file, { idempotent: true });
      }
    } catch {
      // Nothing to clear.
    }
  },
};

const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        persistSession: true,
        storage: Platform.OS === 'web' ? webStorage : nativeStorage,
      },
    })
  : null;
