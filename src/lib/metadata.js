import { normalizePhoneNumber } from './phone.js';
import { generateClientSlug } from './slug.js';

export function serializeMetadata(input) {
  const name = toStr(input?.name);
  const email = toStr(input?.email).toLowerCase();
  const company = toStr(input?.company);
  const phone = normalizePhoneNumber(toStr(input?.phone));
  const template = toStr(input?.template);
  const plan = toStr(input?.plan).toLowerCase();
  const locale = toStr(input?.locale).toLowerCase();
  const clientSlug = generateClientSlug(name, company);
  const agencyId = toStr(input?.agencyId || input?.agency_id);
  const tenantId = toStr(input?.tenant_id || input?.tenantId || input?.tenant);

  const meta = { name, email, company, phone, template, plan, locale, clientSlug, agencyId, tenant_id: tenantId };
  return JSON.parse(JSON.stringify(meta));
}

function toStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}
