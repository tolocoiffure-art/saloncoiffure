import { ENV } from './env';
import { logger } from './logger.js';
import { deployTemplate, waitForDeploymentStatus, attachDomainToDeployment, generatePreviewUrl, updateSupabaseWithPreviewUrl } from './vercel';
import { sendDeploymentReadyEmail, sendAdminDeploymentEmail } from './email';

export async function triggerTemplateDeployment(sessionOrOrder) {
  if (!ENV.DEPLOY_AUTOMATION_ENABLED) return null;
  try {
    const md = sessionOrOrder?.metadata || {};
    const template = String(md.template || '');
    const clientSlug = String(md.clientSlug || 'client');
    const orderId = sessionOrOrder?.id || null;

    const deploy = await deployTemplate(template, clientSlug);
    const ready = await waitForDeploymentStatus(deploy.id);
    const previewUrl = generatePreviewUrl(ready) || ready?.url || '';
    if (orderId && previewUrl) await updateSupabaseWithPreviewUrl(orderId, previewUrl);

    const domain = ENV.DOMAIN_ROOT ? `${clientSlug}.${ENV.DOMAIN_ROOT}` : '';
    if (domain && ready?.id) {
      await attachDomainToDeployment(domain, ready.id);
    }

    try { await sendDeploymentReadyEmail({ customer_email: sessionOrOrder?.customer_details?.email }, previewUrl); } catch {}
    try {
      await sendAdminDeploymentEmail({
        projectName: md.projectName || md.name || md.template || 'Projet',
        previewUrl,
      });
    } catch {}
    return { previewUrl };
  } catch (e) {
    logger.error(e, { where: 'triggerTemplateDeployment' });
    return null;
  }
}

