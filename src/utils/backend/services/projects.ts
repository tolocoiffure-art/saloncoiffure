// src/utils/backend/services/projects.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { ProjectInput } from '../validation';

export interface ProjectRecord {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  currency: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface ListProjectsOptions {
  page: number;
  pageSize: number;
  status?: string;
  clientId?: string;
  search?: string | null;
}

export interface ListProjectsResult {
  projects: ProjectWithMetrics[];
  total: number;
}

export interface ProjectMetrics {
  totalTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
}

export interface ProjectWithMetrics extends ProjectRecord {
  metrics?: ProjectMetrics;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function listProjects(
  client: SupabaseClient,
  agencyId: string,
  options: ListProjectsOptions,
): Promise<ListProjectsResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('agency_id', agencyId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.clientId) {
    query = query.eq('client_id', options.clientId);
  }

  if (options.search) {
    const sanitized = sanitizeSearchTerm(options.search);
    if (sanitized) {
      const pattern = `%${sanitized.replace(/[%_]/g, '')}%`;
      query = query.or(
        ['name', 'notes'].map((column) => `${column}.ilike.${pattern}`).join(','),
      );
    }
  }

  const { data, error, count } = await query
    .order('due_date', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to list projects', error);
    throw new ApiError(500, 'Unable to load projects');
  }

  const projects = (data ?? []) as ProjectRecord[];

  if (!projects.length) {
    return {
      projects: [],
      total: count ?? 0,
    };
  }

  const projectIds = projects.map((project) => project.id);
  const { data: taskRows, error: taskError } = await client
    .from('tasks')
    .select('id, project_id, status, due_date')
    .in('project_id', projectIds)
    .eq('agency_id', agencyId);

  if (taskError) {
    console.error('Failed to load project task metrics', taskError);
    throw new ApiError(500, 'Unable to load projects');
  }

  const now = new Date();

  const metricsMap = (taskRows ?? []).reduce<Record<string, ProjectMetrics>>((acc, task) => {
    if (!task.project_id) return acc;
    if (!acc[task.project_id]) {
      acc[task.project_id] = {
        totalTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
      };
    }

    const metrics = acc[task.project_id];
    metrics.totalTasks += 1;
    if (task.status === 'in_progress') {
      metrics.inProgressTasks += 1;
    }

    if (task.status !== 'done' && task.due_date) {
      const dueDate = new Date(task.due_date);
      if (!Number.isNaN(dueDate.getTime()) && dueDate < now) {
        metrics.overdueTasks += 1;
      }
    }

    return acc;
  }, {});

  return {
    projects: projects.map((project) => ({
      ...project,
      metrics: metricsMap[project.id],
    })),
    total: count ?? 0,
  };
}

export async function getProjectById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<ProjectRecord> {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load project', error);
    throw new ApiError(500, 'Unable to load project');
  }

  if (!data) {
    throw new ApiError(404, 'Project not found');
  }

  return data as ProjectRecord;
}

export async function createProject(
  client: SupabaseClient,
  agencyId: string,
  payload: ProjectInput,
): Promise<ProjectRecord> {
  const { data, error } = await client
    .from('projects')
    .insert({ ...payload, agency_id: agencyId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create project', error);
    throw new ApiError(500, 'Unable to save project');
  }

  return data as ProjectRecord;
}

export async function updateProject(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<ProjectInput>,
): Promise<ProjectRecord> {
  const updatePayload: Record<string, unknown> = { ...payload };

  const { data, error } = await client
    .from('projects')
    .update(updatePayload)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update project', error);
    throw new ApiError(500, 'Unable to update project');
  }

  if (!data) {
    throw new ApiError(404, 'Project not found');
  }

  return data as ProjectRecord;
}

export interface DeleteProjectResult {
  project: Pick<ProjectRecord, 'id' | 'name'>;
  detached: {
    tasks: number;
    invoices: number;
  };
}

export async function deleteProject(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<DeleteProjectResult> {
  const [tasksResult, invoicesResult] = await Promise.all([
    client
      .from('tasks')
      .update({ project_id: null })
      .eq('agency_id', agencyId)
      .eq('project_id', id)
      .select('id'),
    client
      .from('invoices')
      .update({ project_id: null })
      .eq('agency_id', agencyId)
      .eq('project_id', id)
      .select('id'),
  ]);

  if ('error' in tasksResult && tasksResult.error) {
    console.error('Failed to detach project tasks before deletion', tasksResult.error);
    throw new ApiError(500, 'Unable to delete project');
  }

  if ('error' in invoicesResult && invoicesResult.error) {
    console.error('Failed to detach project invoices before deletion', invoicesResult.error);
    throw new ApiError(500, 'Unable to delete project');
  }

  const { data, error } = await client
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('id, name')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete project', error);
    throw new ApiError(500, 'Unable to delete project');
  }

  if (!data) {
    throw new ApiError(404, 'Project not found');
  }

  return {
    project: data as Pick<ProjectRecord, 'id' | 'name'>,
    detached: {
      tasks: Array.isArray(tasksResult.data) ? tasksResult.data.length : 0,
      invoices: Array.isArray(invoicesResult.data) ? invoicesResult.data.length : 0,
    },
  };
}
