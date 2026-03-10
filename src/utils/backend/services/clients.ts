// src/utils/backend/services/clients.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { ClientInput } from '../validation';

export interface ClientRecord {
  id: string;
  agency_id: string;
  company_name: string;
  primary_contact: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  services: string[];
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

export interface ListClientsOptions {
  page: number;
  pageSize: number;
  search?: string | null;
  status?: string;
}

export interface ListClientsResult {
  clients: ClientRecord[];
  total: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeServices(services: string[] | null | undefined): string[] {
  if (!services || !services.length) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of services) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!value) continue;
    const lower = value.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    normalized.push(value);
  }
  return normalized;
}

export async function listClients(
  client: SupabaseClient,
  agencyId: string,
  options: ListClientsOptions,
): Promise<ListClientsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['company_name', 'primary_contact', 'email']
          .map((column) => `${column}.ilike.${pattern}`)
          .join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to list clients', error);
    throw new ApiError(500, 'Unable to load clients');
  }

  return {
    clients: (data ?? []) as ClientRecord[],
    total: count ?? 0,
  };
}

export async function getClientById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<ClientRecord> {
  const { data, error } = await client
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load client', error);
    throw new ApiError(500, 'Unable to load client');
  }

  if (!data) {
    throw new ApiError(404, 'Client not found');
  }

  return data as ClientRecord;
}

export async function createClient(
  client: SupabaseClient,
  agencyId: string,
  payload: ClientInput,
): Promise<ClientRecord> {
  const normalizedServices = normalizeServices(payload.services);

  if (payload.email) {
    const { data: existing, error: lookupError } = await client
      .from('clients')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('email', payload.email)
      .maybeSingle();

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('Failed to verify existing client email', lookupError);
      throw new ApiError(500, 'Unable to validate client');
    }

    if (existing) {
      throw new ApiError(409, 'A client with this email already exists');
    }
  }

  const { data, error } = await client
    .from('clients')
    .insert({
      ...payload,
      services: normalizedServices,
      metadata: payload.metadata ?? {},
      agency_id: agencyId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create client', error);
    throw new ApiError(500, 'Unable to save client');
  }

  return data as ClientRecord;
}

export async function updateClient(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<ClientInput>,
): Promise<ClientRecord> {
  const updatePayload: any = {
    ...payload,
  };

  if (payload.services !== undefined) {
    updatePayload.services = normalizeServices(payload.services);
  }

  if (payload.metadata !== undefined && payload.metadata === null) {
    updatePayload.metadata = {};
  }

  const { data, error } = await client
    .from('clients')
    .update(updatePayload)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update client', error);
    throw new ApiError(500, 'Unable to update client');
  }

  if (!data) {
    throw new ApiError(404, 'Client not found');
  }

  return data as ClientRecord;
}

export async function deleteClient(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<ClientRecord, 'id' | 'company_name'>> {
  const { data, error } = await client
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('id, company_name')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete client', error);
    throw new ApiError(500, 'Unable to delete client');
  }

  if (!data) {
    throw new ApiError(404, 'Client not found');
  }

  return data as Pick<ClientRecord, 'id' | 'company_name'>;
}
