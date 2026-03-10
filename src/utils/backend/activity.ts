// src/utils/backend/activity.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function logAgencyActivity(
  client: SupabaseClient,
  agencyId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await client.from('activities').insert({
      agency_id: agencyId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (error) {
    console.error('Failed to log agency activity', { error, agencyId, action, entityType, entityId });
  }
}
