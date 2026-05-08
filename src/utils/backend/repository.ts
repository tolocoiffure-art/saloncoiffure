// src/utils/backend/repository.ts
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generic helper to fetch one record by ID from a Supabase table.
 */
export async function getById(client: SupabaseClient, table: string, id: string) {
  const { data, error } = await client
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[repository] Failed to load ${table}#${id}`, error);
    throw error;
  }

  return data;
}

/**
 * Generic helper to delete one record by ID.
 */
export async function deleteById(client: SupabaseClient, table: string, id: string) {
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) {
    console.error(`[repository] Failed to delete ${table}#${id}`, error);
    throw error;
  }
  return true;
}

export function ensureRecord<T>(record: T | null | undefined, table = 'unknown') {
  if (!record) {
    const message = `[repository] No record found in table "${table}".`;
    console.error(message);
    throw new Error(message);
  }
  return record;
}