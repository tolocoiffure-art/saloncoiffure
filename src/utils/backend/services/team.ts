// src/utils/backend/services/team.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { TeamMemberInput, TeamMemberUpdateInput } from '../validation';

export interface TeamMemberRecord {
  id: string;
  created_at: string;
  agency_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  timezone: string | null;
}

export interface ListTeamMembersOptions {
  page: number;
  pageSize: number;
  search?: string | null;
  role?: string;
}

export interface ListTeamMembersResult {
  members: TeamMemberRecord[];
  total: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function listTeamMembers(
  client: SupabaseClient,
  agencyId: string,
  options: ListTeamMembersOptions,
): Promise<ListTeamMembersResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('agency_members')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.role) {
    query = query.eq('role', options.role);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['full_name', 'email']
          .map((column) => `${column}.ilike.${pattern}`)
          .join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Failed to list team members', error);
    throw new ApiError(500, 'Unable to load team members');
  }

  return {
    members: (data ?? []) as TeamMemberRecord[],
    total: count ?? 0,
  };
}

export async function getTeamMemberById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<TeamMemberRecord> {
  const { data, error } = await client
    .from('agency_members')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load team member', error);
    throw new ApiError(500, 'Unable to load team member');
  }

  if (!data) {
    throw new ApiError(404, 'Team member not found');
  }

  return data as TeamMemberRecord;
}

function mapTeamMemberPayload(agencyId: string, payload: TeamMemberInput) {
  return {
    agency_id: agencyId,
    user_id: payload.user_id,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    timezone: payload.timezone,
  };
}

function mapTeamMemberUpdate(payload: TeamMemberUpdateInput) {
  const update: Record<string, unknown> = {};

  if (payload.full_name !== undefined) {
    update.full_name = payload.full_name;
  }

  if (payload.email !== undefined) {
    update.email = payload.email;
  }

  if (payload.role !== undefined) {
    update.role = payload.role;
  }

  if (payload.timezone !== undefined) {
    update.timezone = payload.timezone;
  }

  return update;
}

export async function createTeamMember(
  client: SupabaseClient,
  agencyId: string,
  payload: TeamMemberInput,
): Promise<TeamMemberRecord> {
  const insertPayload = mapTeamMemberPayload(agencyId, payload);

  const { data, error } = await client
    .from('agency_members')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create team member', error);
    if (error?.code === '23505') {
      throw new ApiError(409, 'Team member already exists for this user');
    }
    throw new ApiError(500, 'Unable to save team member');
  }

  return data as TeamMemberRecord;
}

export async function updateTeamMember(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: TeamMemberUpdateInput,
): Promise<TeamMemberRecord> {
  const updatePayload = mapTeamMemberUpdate(payload);

  if (Object.keys(updatePayload).length === 0) {
    return await getTeamMemberById(client, agencyId, id);
  }

  const { data, error } = await client
    .from('agency_members')
    .update(updatePayload)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update team member', error);
    throw new ApiError(500, 'Unable to update team member');
  }

  if (!data) {
    throw new ApiError(404, 'Team member not found');
  }

  return data as TeamMemberRecord;
}

export async function deleteTeamMember(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<TeamMemberRecord, 'id' | 'full_name' | 'email' | 'role'>> {
  const { data, error } = await client
    .from('agency_members')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('id, full_name, email, role')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete team member', error);
    throw new ApiError(500, 'Unable to delete team member');
  }

  if (!data) {
    throw new ApiError(404, 'Team member not found');
  }

  return data as Pick<TeamMemberRecord, 'id' | 'full_name' | 'email' | 'role'>;
}

