// src/utils/backend/services/tasks.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '../http';
import type { TaskInput } from '../validation';

export interface TaskRecord {
  id: string;
  agency_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TaskWithRelations extends TaskRecord {
  project?: {
    id: string;
    name: string;
    status: string;
    client_id: string | null;
  } | null;
  assignee?: {
    user_id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface ListTasksOptions {
  page: number;
  pageSize: number;
  status?: string;
  priority?: string;
  projectId?: string;
  assigneeId?: string;
  search?: string | null;
  dueBefore?: string | null;
  dueAfter?: string | null;
  includeSummaries?: boolean;
}

export interface TaskSummaries {
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}

export interface ListTasksResult {
  tasks: TaskWithRelations[];
  total: number;
  summaries?: TaskSummaries;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function applyTaskFilters(
  query: any,
  agencyId: string,
  options: ListTasksOptions,
) {
  let builder = query.eq('agency_id', agencyId);

  if (options.status) {
    builder = builder.eq('status', options.status);
  }

  if (options.priority) {
    builder = builder.eq('priority', options.priority);
  }

  if (options.projectId) {
    builder = builder.eq('project_id', options.projectId);
  }

  if (options.assigneeId) {
    builder = builder.eq('assignee_id', options.assigneeId);
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
        ['title', 'description'].map((column) => `${column}.ilike.${pattern}`).join(','),
      );
    }
  }

  return builder;
}

export async function listTasks(
  client: SupabaseClient,
  agencyId: string,
  options: ListTasksOptions,
): Promise<ListTasksResult> {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const baseQuery = client
    .from('tasks')
    .select('*', { count: 'exact' });

  const pagedQuery = applyTaskFilters(baseQuery, agencyId, options)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  const includeSummaries = options.includeSummaries !== false;

  const [listResult, statusAggResult, priorityAggResult] = await Promise.all([
    pagedQuery,
    includeSummaries
      ? applyTaskFilters(
          client.from('tasks').select('status, count:id'),
          agencyId,
          options,
        )
          .group('status')
          .order('status', { ascending: true })
      : Promise.resolve({ data: null, error: null }),
    includeSummaries
      ? applyTaskFilters(
          client.from('tasks').select('priority, count:id'),
          agencyId,
          options,
        )
          .group('priority')
          .order('priority', { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (listResult.error) {
    console.error('Failed to list tasks', listResult.error);
    throw new ApiError(500, 'Unable to load tasks');
  }

  const tasks = (listResult.data ?? []) as TaskRecord[];
  const total = listResult.count ?? 0;

  if (tasks.length === 0) {
    return {
      tasks: [],
      total,
      summaries:
        includeSummaries
          ? { statusCounts: {}, priorityCounts: {} }
          : undefined,
    };
  }

  const projectIds = Array.from(new Set(tasks.map((task) => task.project_id).filter(Boolean)));
  const assigneeIds = Array.from(
    new Set(tasks.map((task) => task.assignee_id).filter((value): value is string => Boolean(value))),
  );

  const [projectsResult, assigneesResult] = await Promise.all([
    projectIds.length
      ? client
          .from('projects')
          .select('id, name, status, client_id')
          .in('id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    assigneeIds.length
      ? client
          .from('agency_members')
          .select('user_id, full_name, email')
          .in('user_id', assigneeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (projectsResult.error) {
    console.error('Failed to load related projects for tasks', projectsResult.error);
    throw new ApiError(500, 'Unable to load tasks');
  }

  if (assigneesResult.error) {
    console.error('Failed to load related assignees for tasks', assigneesResult.error);
    throw new ApiError(500, 'Unable to load tasks');
  }

  const projectMap = (projectsResult.data ?? []).reduce<Record<string, TaskWithRelations['project']>>(
    (acc, project) => {
      acc[project.id] = {
        id: project.id,
        name: project.name,
        status: project.status,
        client_id: project.client_id,
      };
      return acc;
    },
    {},
  );

  const assigneeMap = (assigneesResult.data ?? []).reduce<
    Record<string, TaskWithRelations['assignee']>
  >((acc, member) => {
    acc[member.user_id] = {
      user_id: member.user_id,
      full_name: member.full_name,
      email: member.email,
    };
    return acc;
  }, {});

  const enrichedTasks: TaskWithRelations[] = tasks.map((task) => ({
    ...task,
    project: task.project_id ? projectMap[task.project_id] ?? null : null,
    assignee: task.assignee_id ? assigneeMap[task.assignee_id] ?? null : null,
  }));

  let summaries: TaskSummaries | undefined;

  if (includeSummaries) {
    if (statusAggResult && 'error' in statusAggResult && statusAggResult.error) {
      console.error('Failed to aggregate task status counts', statusAggResult.error);
      throw new ApiError(500, 'Unable to summarize tasks');
    }

    if (priorityAggResult && 'error' in priorityAggResult && priorityAggResult.error) {
      console.error('Failed to aggregate task priority counts', priorityAggResult.error);
      throw new ApiError(500, 'Unable to summarize tasks');
    }

    const statusCounts = ((statusAggResult as { data: { status: string; count: number }[] | null })?.data ?? []).reduce<
      Record<string, number>
    >((acc, row) => {
      if (row.status) {
        acc[row.status] = row.count ?? 0;
      }
      return acc;
    }, {});

    const priorityCounts = ((
      priorityAggResult as { data: { priority: string; count: number }[] | null }
    )?.data ?? []).reduce<Record<string, number>>((acc, row) => {
      if (row.priority) {
        acc[row.priority] = row.count ?? 0;
      }
      return acc;
    }, {});

    summaries = {
      statusCounts,
      priorityCounts,
    };
  }

  return {
    tasks: enrichedTasks,
    total,
    summaries,
  };
}

export async function getTaskById(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<TaskRecord> {
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load task', error);
    throw new ApiError(500, 'Unable to load task');
  }

  if (!data) {
    throw new ApiError(404, 'Task not found');
  }

  return data as TaskRecord;
}

export async function createTask(
  client: SupabaseClient,
  agencyId: string,
  payload: TaskInput,
): Promise<TaskRecord> {
  const { data, error } = await client
    .from('tasks')
    .insert({ ...payload, agency_id: agencyId })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create task', error);
    throw new ApiError(500, 'Unable to save task');
  }

  return data as TaskRecord;
}

export async function updateTask(
  client: SupabaseClient,
  agencyId: string,
  id: string,
  payload: Partial<TaskInput>,
): Promise<TaskRecord> {
  const updatePayload = { ...payload } as Record<string, unknown>;

  const { data, error } = await client
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Failed to update task', error);
    throw new ApiError(500, 'Unable to update task');
  }

  if (!data) {
    throw new ApiError(404, 'Task not found');
  }

  return data as TaskRecord;
}

export async function deleteTask(
  client: SupabaseClient,
  agencyId: string,
  id: string,
): Promise<Pick<TaskRecord, 'id' | 'title'>> {
  const { data, error } = await client
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)
    .select('id, title')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete task', error);
    throw new ApiError(500, 'Unable to delete task');
  }

  if (!data) {
    throw new ApiError(404, 'Task not found');
  }

  return data as Pick<TaskRecord, 'id' | 'title'>;
}
