// src/utils/backend/services/documents.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { DocumentInput } from '../validation';

export interface DocumentRecord extends DocumentInput {
  id: string;
  agency_id: string;
  created_at: string;
  updated_at?: string;
}

export interface ListDocumentsOptions {
  page: number;
  pageSize: number;
  search?: string | null;
  status?: string;
  type?: string;
}

export interface ListDocumentsResult {
  documents: DocumentRecord[];
  total: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[\n\r\t]+/g, ' ').trim();
}

export async function listDocuments(
  client: SupabaseClient,
  agencyId: string,
  options: ListDocumentsOptions,
): Promise<ListDocumentsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.type) {
    query = query.eq('document_type', options.type);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['title', 'storage_path']
          .map((column) => `${column}.ilike.${pattern}`)
          .join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to list documents', error);
    throw new ApiError(500, 'Unable to load documents');
  }

  return {
    documents: (data ?? []) as DocumentRecord[],
    total: count ?? 0,
  };
}

export async function getDocumentById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<DocumentRecord> {
  const { data, error } = await client
    .from('documents')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load document', error);
    throw new ApiError(500, 'Unable to load document');
  }

  if (!data) {
    throw new ApiError(404, 'Document not found');
  }

  return data as DocumentRecord;
}

export async function createDocument(
  client: SupabaseClient,
  agencyId: string,
  payload: DocumentInput,
): Promise<DocumentRecord> {
  const { data, error } = await client
    .from('documents')
    .insert({ ...payload, agency_id: agencyId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create document', error);
    throw new ApiError(500, 'Unable to save document');
  }

  return data as DocumentRecord;
}

export async function updateDocument(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<DocumentInput>,
): Promise<DocumentRecord> {
  const updatePayload = { ...payload } as Record<string, unknown>;

  const { data, error } = await client
    .from('documents')
    .update(updatePayload)
    .eq('agency_id', agencyId)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update document', error);
    throw new ApiError(500, 'Unable to update document');
  }

  if (!data) {
    throw new ApiError(404, 'Document not found');
  }

  return data as DocumentRecord;
}

export async function deleteDocument(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<DocumentRecord, 'id' | 'title' | 'document_type'>> {
  const { data, error } = await client
    .from('documents')
    .delete()
    .eq('agency_id', agencyId)
    .eq('id', id)
    .select('id, title, document_type')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete document', error);
    throw new ApiError(500, 'Unable to delete document');
  }

  if (!data) {
    throw new ApiError(404, 'Document not found');
  }

  return data as Pick<DocumentRecord, 'id' | 'title' | 'document_type'>;
}
