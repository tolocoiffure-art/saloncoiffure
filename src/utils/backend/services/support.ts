// src/utils/backend/services/support.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { SupportRequestInput } from '../validation';

export interface SupportRequestRecord extends SupportRequestInput {
  id: string;
  agency_id: string;
  created_at: string;
  updated_at?: string;
}

export interface ListSupportRequestsOptions {
  page: number;
  pageSize: number;
  search?: string | null;
  status?: string;
  priority?: string;
  websiteId?: string;
}

export interface ListSupportRequestsResult {
  requests: SupportRequestRecord[];
  total: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[\n\r\t]+/g, ' ').trim();
}

export async function listSupportRequests(
  client: SupabaseClient,
  agencyId: string,
  options: ListSupportRequestsOptions,
): Promise<ListSupportRequestsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('support_requests')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.priority) {
    query = query.eq('priority', options.priority);
  }

  if (options.websiteId) {
    query = query.eq('website_id', options.websiteId);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['description', 'customer_name', 'customer_email']
          .map((column) => `${column}.ilike.${pattern}`)
          .join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to list support requests', error);
    throw new ApiError(500, 'Unable to load support pipeline');
  }

  return {
    requests: (data ?? []) as SupportRequestRecord[],
    total: count ?? 0,
  };
}

export async function getSupportRequestById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<SupportRequestRecord> {
  const { data, error } = await client
    .from('support_requests')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load support request', error);
    throw new ApiError(500, 'Unable to load support request');
  }

  if (!data) {
    throw new ApiError(404, 'Support request not found');
  }

  return data as SupportRequestRecord;
}

export async function createSupportRequest(
  client: SupabaseClient,
  agencyId: string,
  payload: SupportRequestInput,
): Promise<SupportRequestRecord> {
  const { data, error } = await client
    .from('support_requests')
    .insert({ ...payload, agency_id: agencyId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create support request', error);
    throw new ApiError(500, 'Unable to create ticket');
  }

  return data as SupportRequestRecord;
}

export async function updateSupportRequest(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<SupportRequestInput>,
): Promise<SupportRequestRecord> {
  const updatePayload = { ...payload } as Record<string, unknown>;

  const { data, error } = await client
    .from('support_requests')
    .update(updatePayload)
    .eq('agency_id', agencyId)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update support request', error);
    throw new ApiError(500, 'Unable to update ticket');
  }

  if (!data) {
    throw new ApiError(404, 'Support request not found');
  }

  return data as SupportRequestRecord;
}

export async function deleteSupportRequest(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<SupportRequestRecord, 'id' | 'request_type' | 'status'>> {
  const { data, error } = await client
    .from('support_requests')
    .delete()
    .eq('agency_id', agencyId)
    .eq('id', id)
    .select('id, request_type, status')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete support request', error);
    throw new ApiError(500, 'Unable to delete ticket');
  }

  if (!data) {
    throw new ApiError(404, 'Support request not found');
  }

  return data as Pick<SupportRequestRecord, 'id' | 'request_type' | 'status'>;
}
