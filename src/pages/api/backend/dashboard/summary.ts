import type { APIRoute } from 'astro';

import { getAgencyContext } from '~/utils/backend/context';
import { withAuth } from '~/utils/supabase/auth';

export const prerender = false;

export const GET: APIRoute = withAuth(async ({ locals }) => {
  const { agency, user, client, admin } = await getAgencyContext(locals);
  const db = admin ?? client;
  const now = new Date();
  const nowIso = now.toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const parseCount = (label: string, result: { count: number | null; error: unknown }) => {
    if (result.error) {
      console.error(`Failed to load count for ${label}`, result.error);
      return 0;
    }
    return result.count ?? 0;
  };

  const [
    clientsResult,
    activeProjectsResult,
    liveWebsitesResult,
    overdueTasksResult,
    blockedTasksResult,
    inProgressTasksResult,
    invoicesResult,
    membersResult,
    payingOrdersResult,
    paidOrdersLast30Result,
    recentDocumentsResult,
    recentActivitiesResult,
  ] =
    await Promise.all([
      db
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id),
      db
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .neq('status', 'completed'),
      db
        .from('websites')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .eq('status', 'live'),
      db
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .not('status', 'eq', 'done')
        .not('due_date', 'is', null)
        .lt('due_date', nowIso),
      db
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .eq('status', 'blocked'),
      db
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .eq('status', 'in_progress'),
      db
        .from('invoices')
        .select('amount, status, issue_date, due_date')
        .eq('agency_id', agency.id),
      db
        .from('agency_members')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id),
      db
        .from('orders')
        .select('customer_email')
        .or(`agency_id.is.null,agency_id.eq.${agency.id}`)
        .in('status', ['paid', 'complete']),
      db
        .from('orders')
        .select('amount_total, currency, created_at')
        .or(`agency_id.is.null,agency_id.eq.${agency.id}`)
        .in('status', ['paid', 'complete'])
        .gte('created_at', thirtyDaysAgo),
      db
        .from('documents')
        .select('*')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false })
        .limit(5),
      db
        .from('activities')
        .select('*')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  const clientsCount = parseCount('clients', clientsResult);
  const activeProjectsCount = parseCount('projects', activeProjectsResult);
  const liveWebsitesCount = parseCount('websites-live', liveWebsitesResult);
  const overdueTasksCount = parseCount('tasks-overdue', overdueTasksResult);
  const blockedTasksCount = parseCount('tasks-blocked', blockedTasksResult);
  const inProgressTasksCount = parseCount('tasks-in-progress', inProgressTasksResult);
  const membersCount = parseCount('members', membersResult);

  const invoices = invoicesResult.error ? [] : invoicesResult.data ?? [];
  const outstandingAmount = invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((total, invoice) => total + (invoice.amount ?? 0), 0);

  const revenueLast30Days = invoices
    .filter((invoice) => invoice.status === 'paid' && invoice.issue_date >= thirtyDaysAgo)
    .reduce((total, invoice) => total + (invoice.amount ?? 0), 0);

  const documents = recentDocumentsResult.error ? [] : recentDocumentsResult.data ?? [];
  const activities = recentActivitiesResult.error ? [] : recentActivitiesResult.data ?? [];
  const payingOrders = payingOrdersResult.error ? [] : payingOrdersResult.data ?? [];
  const payingCustomersCount = Array.from(
    new Set(
      payingOrders
        .map((order) => (order?.customer_email || order?.customer_name || '').trim().toLowerCase())
        .filter((email) => email.length),
    ),
  ).length;
  const paidOrdersLast30 = paidOrdersLast30Result.error ? [] : paidOrdersLast30Result.data ?? [];
  const revenueLast30DaysOrders = paidOrdersLast30.reduce((total, order) => {
    const amount = typeof order.amount_total === 'number' ? order.amount_total : 0;
    return total + amount / 100;
  }, 0);

  return new Response(
    JSON.stringify({
      agency,
      user,
      metrics: {
        members: membersCount,
        clients: clientsCount,
        activeProjects: activeProjectsCount,
        liveWebsites: liveWebsitesCount,
        outstandingAmount,
        revenueLast30Days,
        payingCustomers: payingCustomersCount,
        revenueLast30DaysOrders,
      },
      tasks: {
        overdue: overdueTasksCount,
        blocked: blockedTasksCount,
        inProgress: inProgressTasksCount,
      },
      documents,
      activities,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
