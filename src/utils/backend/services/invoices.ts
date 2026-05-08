// src/utils/backend/services/invoices.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { InvoiceInput } from '../validation';

export interface InvoiceRecord {
  id: string;
  agency_id: string;
  client_id: string | null;
  project_id: string | null;
  invoice_number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  currency: string | null;
  amount: number | null;
  line_items: InvoiceInput['line_items'] | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ListInvoicesOptions {
  page: number;
  pageSize: number;
  status?: string;
  clientId?: string;
  projectId?: string;
  search?: string | null;
  issuedBefore?: string | null;
  issuedAfter?: string | null;
  dueBefore?: string | null;
  dueAfter?: string | null;
  includeSummaries?: boolean;
}

export interface ListInvoicesResult {
  invoices: InvoiceRecord[];
  total: number;
  summaries?: InvoiceSummaries;
}

export interface InvoiceSummaries {
  statusCounts: Record<string, number>;
  outstandingAmount: number;
  overdueAmount: number;
  totalAmount: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function applyInvoiceFilters(
  query: any,
  agencyId: string,
  options: ListInvoicesOptions,
) {
  let builder = query.eq('agency_id', agencyId);

  if (options.status) {
    builder = builder.eq('status', options.status);
  }

  if (options.clientId) {
    builder = builder.eq('client_id', options.clientId);
  }

  if (options.projectId) {
    builder = builder.eq('project_id', options.projectId);
  }

  if (options.issuedBefore) {
    builder = builder.lte('issue_date', options.issuedBefore);
  }

  if (options.issuedAfter) {
    builder = builder.gte('issue_date', options.issuedAfter);
  }

  if (options.dueBefore) {
    builder = builder.lte('due_date', options.dueBefore);
  }

  if (options.dueAfter) {
    builder = builder.gte('due_date', options.dueAfter);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      builder = builder.or(
        ['invoice_number', 'notes'].map((column) => `${column}.ilike.${pattern}`).join(','),
      );
    }
  }

  return builder;
}

export async function listInvoices(
  client: SupabaseClient,
  agencyId: string,
  options: ListInvoicesOptions,
): Promise<ListInvoicesResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const baseQuery = client
    .from('invoices')
    .select('*', { count: 'exact' });

  const pagedQuery = applyInvoiceFilters(baseQuery, agencyId, options)
    .order('issue_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  const includeSummaries = options.includeSummaries !== false;

  const [listResult, statusAggResult] = await Promise.all([
    pagedQuery,
    includeSummaries
      ? applyInvoiceFilters(
          client.from('invoices').select('status, amount, due_date, issue_date'),
          agencyId,
          options,
        )
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (listResult.error) {
    console.error('Failed to list invoices', listResult.error);
    throw new ApiError(500, 'Unable to load invoices');
  }

  const invoices = (listResult.data ?? []) as InvoiceRecord[];
  const total = listResult.count ?? 0;

  let summaries: InvoiceSummaries | undefined;

  if (includeSummaries) {
    if (statusAggResult && 'error' in statusAggResult && statusAggResult.error) {
      console.error('Failed to aggregate invoice summaries', statusAggResult.error);
      throw new ApiError(500, 'Unable to summarize invoices');
    }

    const rows = ((statusAggResult as { data: InvoiceRecord[] | null })?.data ?? []).filter(Boolean);

    const statusCounts: Record<string, number> = {};
    let outstandingAmount = 0;
    let overdueAmount = 0;
    let totalAmount = 0;
    const now = new Date();

    for (const row of rows) {
      const statusKey = row.status ?? 'unknown';
      statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;
      const amount = row.amount ?? 0;
      totalAmount += amount;

      if (row.status === 'sent' || row.status === 'overdue') {
        outstandingAmount += amount;
      }

      if (row.status !== 'paid' && row.due_date) {
        const dueDate = new Date(row.due_date);
        if (!Number.isNaN(dueDate.getTime()) && dueDate < now) {
          overdueAmount += amount;
        }
      }
    }

    summaries = {
      statusCounts,
      outstandingAmount,
      overdueAmount,
      totalAmount,
    };
  }

  return {
    invoices,
    total,
    summaries,
  };
}

export async function getInvoiceById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<InvoiceRecord> {
  const { data, error } = await client
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load invoice', error);
    throw new ApiError(500, 'Unable to load invoice');
  }

  if (!data) {
    throw new ApiError(404, 'Invoice not found');
  }

  return data as InvoiceRecord;
}

export async function createInvoice(
  client: SupabaseClient,
  agencyId: string,
  payload: InvoiceInput,
): Promise<InvoiceRecord> {
  const { data, error } = await client
    .from('invoices')
    .insert({ ...payload, agency_id: agencyId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create invoice', error);
    throw new ApiError(500, 'Unable to save invoice');
  }

  return data as InvoiceRecord;
}

export async function updateInvoice(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<InvoiceInput>,
): Promise<InvoiceRecord> {
  const updatePayload: any = { ...payload };

  if (payload.line_items !== undefined && payload.line_items.length) {
    updatePayload.amount = payload.line_items.reduce(
      (total, item) => total + item.quantity * item.unit_amount,
      0,
    );
  }

  if (payload.currency) {
    updatePayload.currency = payload.currency.toUpperCase();
  }

  const { data, error } = await client
    .from('invoices')
    .update(updatePayload)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update invoice', error);
    throw new ApiError(500, 'Unable to update invoice');
  }

  if (!data) {
    throw new ApiError(404, 'Invoice not found');
  }

  return data as InvoiceRecord;
}

export async function deleteInvoice(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<InvoiceRecord, 'id' | 'invoice_number'>> {
  const { data, error } = await client
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('id, invoice_number')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete invoice', error);
    throw new ApiError(500, 'Unable to delete invoice');
  }

  if (!data) {
    throw new ApiError(404, 'Invoice not found');
  }

  return data as Pick<InvoiceRecord, 'id' | 'invoice_number'>;
}
