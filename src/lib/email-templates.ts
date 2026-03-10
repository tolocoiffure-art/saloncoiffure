import { ENV } from './env';

// Shared locale type used by email rendering and callers
export type EmailLocale = 'fr' | 'en' | 'de' | 'it';

type CTA = { label: string; url: string } | null;

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTagsToText(html: string) {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCurrency(amount: unknown, currency: string | null | undefined) {
  const value = typeof amount === 'number' ? amount : Number(amount || 0);
  if (!Number.isFinite(value)) return '—';
  const cur = currency || 'CHF';
  try {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: cur }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${cur}`.trim();
  }
}

export function formatAmountForLocale(amount: unknown, currency: string | null | undefined, locale: EmailLocale) {
  const value = typeof amount === 'number' ? amount : Number(amount || 0);
  if (!Number.isFinite(value)) return '—';
  const cur = String(currency || 'CHF').toUpperCase();
  const tag = locale === 'fr' ? 'fr-CH' : locale === 'de' ? 'de-CH' : locale === 'it' ? 'it-CH' : 'en-CH';
  try {
    return new Intl.NumberFormat(tag, { style: 'currency', currency: cur }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${cur}`.trim();
  }
}

function getBrand() {
  const brand = {
    name: ENV.SENDER_NAME || 'Pedro Déménagement',
    supportEmail: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    origin: ENV.ORIGIN || 'http://www.pedrodemenagement.ch',
    // palette — lightweight, email‑safe
    bg: '#f6f9fc',
    cardBg: '#ffffff',
    text: '#0f172a', // slate-900
    muted: '#475569', // slate-600
    border: '#e2e8f0', // slate-200
    primary: '#2563eb', // blue-600
    primaryText: '#ffffff',
  } as const;
  return brand;
}

export function renderLayout({
  title,
  preheader,
  contentHtml,
  cta,
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
  cta?: CTA;
}) {
  const brand = getBrand();
  const safePre = escapeHtml(preheader || stripTagsToText(contentHtml).slice(0, 140));

  return `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0; padding:0; background:${brand.bg}; color:${brand.text}; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;">
      <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${safePre}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${brand.bg};">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:100%; background:${brand.cardBg}; border-radius:12px; border:1px solid ${brand.border};">
              <tr>
                <td style="padding:24px 28px; border-bottom:1px solid ${brand.border};">
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; font-size:18px; font-weight:700; color:${brand.text};">
                    ${escapeHtml(brand.name)}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px;">
                  <h1 style="margin:0 0 12px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; font-size:22px; line-height:28px; font-weight:700; color:${brand.text};">${escapeHtml(title)}</h1>
                  <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; font-size:16px; line-height:24px; color:${brand.text};">
                    ${contentHtml}
                  </div>
                  ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td align="left" style="border-radius:8px; background:${brand.primary};">
                    <a href="${escapeHtml(cta.url)}" target="_blank" style="display:inline-block; color:${brand.primaryText}; text-decoration:none; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; font-size:16px; line-height:20px; padding:12px 18px; border-radius:8px;">${escapeHtml(cta.label)}</a>
                  </td></tr></table>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px; border-top:1px solid ${brand.border}; background:${brand.cardBg};">
                  <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; font-size:12px; line-height:18px; color:${brand.muted};">
                    Cet email vous est envoyé par ${escapeHtml(brand.name)}. Besoin d'aide ? Écrivez-nous sur <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${brand.muted}; text-decoration:underline;">${escapeHtml(brand.supportEmail)}</a>.
                  </div>
                </td>
              </tr>
            </table>
            <div style="height:24px; line-height:24px;">&nbsp;</div>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export function renderTemplate(name: string, data: any) {
  const brand = getBrand();

  switch (name) {
    case 'admin_user_signup': {
      const email = escapeHtml(String(data?.email || ''));
      const name = escapeHtml(String(data?.name || ''));
      const plan = escapeHtml(String(data?.plan || ''));
      const template = escapeHtml(String(data?.template || ''));
      const phone = escapeHtml(String(data?.phone || ''));

      const rows = [
        ['Email', email || '—'],
        ['Nom', name || '—'],
        ['Téléphone', phone || '—'],
        ['Plan', plan || '—'],
        ['Modèle', template || '—'],
      ]
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:6px 12px; font-weight:600; width:180px;">${label}</td>
              <td style="padding:6px 12px;">${value}</td>
            </tr>
          `,
        )
        .join('');

      const content = `
        <p>Un nouvel utilisateur vient de créer un compte.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid ${brand.border}; border-radius:12px; overflow:hidden; font-size:14px; line-height:20px;">
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;">S'il a déjà passé commande, vous recevrez un email séparé avec les détails de l'achat.</p>
      `;
      return renderLayout({
        title: 'Nouveau compte créé',
        preheader: `Compte créé – ${email}`,
        contentHtml: content,
        cta: { label: 'Voir le tableau de bord', url: `${brand.origin.replace(/\/$/, '')}/app` },
      });
    }
    case 'welcome': {
      const person = escapeHtml(data?.name || 'Bonjour');
      const verifyUrl = String(data?.verifyUrl || '');
      const content = `
        <p>${person} 👋,</p>
        <p>Votre compte ${escapeHtml(brand.name)} a été créé avec succès.</p>
        ${verifyUrl ? `<p>Validez votre adresse email en cliquant sur le bouton ci-dessous.</p>` : ''}
        <p>Vous pouvez dès maintenant vous connecter pour suivre vos projets, gérer vos paiements et demander des ajustements.</p>
      `;
      return renderLayout({ title: 'Bienvenue', preheader: 'Bienvenue chez ' + brand.name, contentHtml: content, cta: verifyUrl ? { label: 'Valider mon email', url: verifyUrl } : null });
    }
    case 'password_reset': {
      const resetUrl = String(data?.resetUrl || '');
      const content = `
        <p>Nous avons reçu une demande de réinitialisation de mot de passe.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      `;
      return renderLayout({ title: 'Réinitialisation du mot de passe', preheader: 'Définissez un nouveau mot de passe', contentHtml: content, cta: resetUrl ? { label: 'Définir un nouveau mot de passe', url: resetUrl } : null });
    }
    case 'password_changed': {
      const content = `
        <p>Votre mot de passe ${escapeHtml(brand.name)} a été modifié avec succès.</p>
        <p>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre équipe support.</p>
      `;
      return renderLayout({ title: 'Mot de passe mis à jour', preheader: 'Mot de passe mis à jour', contentHtml: content });
    }
    case 'project_ready': {
      const project = escapeHtml(data?.projectName || 'Votre site');
      const preview = String(data?.previewUrl || '');
      const content = `
        <p>Nous venons de terminer la première version de <strong>${project}</strong>.</p>
        <p>Consultez la maquette et partagez vos retours pour les derniers ajustements.</p>`;
      return renderLayout({ title: `${project} est prêt à être validé`, preheader: `${project} est prêt`, contentHtml: content, cta: preview ? { label: 'Voir la maquette', url: preview } : null });
    }
    case 'project_delayed': {
      const project = escapeHtml(data?.projectName || 'Votre site');
      const eta = escapeHtml(data?.newEta || 'bientôt');
      const content = `
        <p>Nous avons dû ajuster le calendrier du projet <strong>${project}</strong>.</p>
        <p>La nouvelle date de livraison estimée est le <strong>${eta}</strong>.</p>
      `;
      return renderLayout({ title: `Mise à jour du planning`, preheader: `Mise à jour du planning pour ${project}`, contentHtml: content });
    }
    case 'support_ticket': {
      const id = escapeHtml(data?.ticketId || '#');
      const summary = escapeHtml(data?.summary || 'Nouveau ticket');
      const customer = escapeHtml(data?.customerName || 'Client');
      const priority = escapeHtml(data?.priority || 'normal');
      const content = `
        <p>Nouvelle demande client reçue.</p>
        <p><strong>${customer}</strong> (${priority}) : ${summary}</p>
      `;
      return renderLayout({ title: `Nouveau ticket ${id}`, preheader: `Nouveau ticket ${id}`, contentHtml: content });
    }
    case 'subscription_update': {
      const id = escapeHtml(data?.subscriptionId || 'abonnement');
      const action = String(data?.action || 'updated') === 'canceled' ? 'annulé' : 'mis à jour';
      const content = `
        <p>Nous confirmons que votre abonnement <strong>${id}</strong> a bien été ${action}.</p>
      `;
      return renderLayout({ title: 'Mise à jour de votre abonnement', preheader: `Votre abonnement ${id} a été ${action}`, contentHtml: content });
    }
    case 'feedback_notification': {
      const project = escapeHtml(data?.project || 'Projet');
      const author = escapeHtml(data?.author || 'Client');
      const message = escapeHtml(data?.message || '');
      const content = `
        <p>Vous avez reçu un nouveau retour client pour <strong>${project}</strong>.</p>
        <blockquote style="margin:16px 0; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">${message}</blockquote>
        <p><em>${author}</em></p>
      `;
      return renderLayout({ title: `Nouveau retour client`, preheader: `Nouveau retour client sur ${project}`, contentHtml: content });
    }
    case 'admin_notification': {
      const order = data?.order || data || {};
      const metadata = order.metadata || {};
      const titleNumber = order.order_number ? `Nouvelle commande ${escapeHtml(order.order_number)}` : 'Nouvelle commande';
      const amount = formatCurrency(order.amount_total, order.currency);
      const details = [
        ['Numéro de commande', order.order_number || '—'],
        [
          'Client',
          `${escapeHtml(order.customer_name || metadata.name || 'Client Pedro Déménagement')} (${escapeHtml(
            order.customer_email || metadata.email || brand.supportEmail,
          )})`,
        ],
        ['Entreprise', escapeHtml(order.company || metadata.company || '—')],
        ['Téléphone', escapeHtml(order.phone || metadata.phone || '—')],
        ['Plan', escapeHtml(order.plan || metadata.plan || '—')],
        ['Modèle', escapeHtml(order.template_key || metadata.template || '—')],
        ['Montant', escapeHtml(amount)],
        ['Statut Stripe', escapeHtml(order.status || '—')],
      ]
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:6px 12px; font-weight:600; width:180px; vertical-align:top;">${label}</td>
              <td style="padding:6px 12px;">${value}</td>
            </tr>
          `,
        )
        .join('');

      const notes = [
        metadata.clientSlug ? `<li><strong>Slug souhaité :</strong> ${escapeHtml(metadata.clientSlug)}</li>` : '',
        metadata.notes ? `<li><strong>Notes :</strong> ${escapeHtml(metadata.notes)}</li>` : '',
      ]
        .filter(Boolean)
        .join('');

      const stripeLink = order.stripe_session_id
        ? order.mode === 'subscription' && order.subscription_id
          ? `https://dashboard.stripe.com/subscriptions/${escapeHtml(order.subscription_id)}`
          : `https://dashboard.stripe.com/checkouts/sessions/${escapeHtml(order.stripe_session_id)}`
        : '';

      const content = `
        <p>Une nouvelle commande vient d'être enregistrée.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid ${brand.border}; border-radius:12px; overflow:hidden; font-size:14px; line-height:20px;">
          <tbody>${details}</tbody>
        </table>
        ${notes ? `<p style="margin-top:16px; font-weight:600;">Notes client</p><ul style="margin:8px 0 0 20px; padding:0;">${notes}</ul>` : ''}
        <p style="margin-top:20px;">Démarrez la production, envoyez les accès et planifiez le premier appel avec le client.</p>
        ${
          stripeLink
            ? `<p style="margin-top:16px;"><a href="${stripeLink}" target="_blank" rel="noopener" style="color:${brand.primary}; text-decoration:none; font-weight:600;">Ouvrir la commande dans Stripe →</a></p>`
            : ''
        }
      `;
      return renderLayout({
        title: titleNumber,
        preheader: `Commande ${order.order_number || ''} – ${order.plan || metadata.plan || 'nouvelle commande'}`.trim(),
        contentHtml: content,
        cta: { label: 'Voir les commandes', url: `${brand.origin.replace(/\/$/, '')}/app/orders` },
      });
    }
    case 'client_confirmation': {
      const order = data?.order || {};
      const metadata = order.metadata || {};
      const amount = formatCurrency(order.amount_total, order.currency);
      const rows = [
        ['Numéro de commande', order.order_number || '—'],
        ['Plan sélectionné', escapeHtml(order.plan || metadata.plan || '—')],
        ['Modèle choisi', escapeHtml(order.template_key || metadata.template || '—')],
        ['Montant payé', escapeHtml(amount)],
      ]
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:6px 12px; font-weight:600; width:180px;">${label}</td>
              <td style="padding:6px 12px;">${value}</td>
            </tr>
          `,
        )
        .join('');

      const content = `
        <p>Merci beaucoup pour votre confiance ! Nous préparons dès maintenant votre site.</p>
        <p>Voici un récapitulatif de votre commande :</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid ${brand.border}; border-radius:12px; overflow:hidden; font-size:14px; line-height:20px;">
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;">Un membre de notre équipe va vous contacter sous 24 heures pour récupérer les derniers éléments et planifier la mise en route.</p>
        <p>Besoin d'ajouter des précisions ? Répondez directement à cet email ou écrivez-nous sur <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${brand.primary}; text-decoration:none;">${escapeHtml(brand.supportEmail)}</a>.</p>
      `;
      const intakeUrl = (order?.content_doc_url as string) || (ENV.CONTENT_INTAKE_FORM_URL || '');
      return renderLayout({
        title: 'Votre commande est confirmée',
        preheader: `Commande ${order.order_number || ''} reçue`.trim(),
        contentHtml: content,
        cta: intakeUrl ? { label: 'Fournir les contenus', url: intakeUrl } : null,
      });
    }
    default: {
      const content = typeof data?.html === 'string' ? data.html : `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
      return renderLayout({ title: data?.title || 'Notification', preheader: data?.preheader || undefined, contentHtml: content, cta: data?.cta || null });
    }
  }
}

// Compatibility wrapper expected by src/lib/email.ts
export function renderEmailTemplate(
  template: string,
  options: { data?: any; locale?: string | null },
): { subject: string; html: string } {
  const data = options?.data || {};
  const locale = (options?.locale || 'fr') as EmailLocale;
  const brand = getBrand();

  function subjectFor(): string {
    const orderNumber = data?.order_number || data?.metadata?.order_number || data?.order?.order_number || '';
    switch (template) {
      case 'orders/admin-new-order':
        return orderNumber ? `Nouvelle commande ${orderNumber}` : 'Nouvelle commande';
      case 'orders/order-confirmation':
        return orderNumber ? `Votre commande ${orderNumber} est confirmée` : 'Votre commande est confirmée';
      case 'orders/order-update': {
        const status = data?.new_status || data?.status || '';
        const base = orderNumber ? `Mise à jour de votre commande ${orderNumber}` : 'Mise à jour de votre commande';
        return status ? `${base} – ${status}` : base;
      }
      case 'orders/subscription-renewal':
        return 'Renouvellement de votre abonnement';
      case 'orders/subscription-cancelled':
        return 'Votre abonnement a été annulé';
      case 'subscription_update':
        return 'Mise à jour de votre abonnement';
      case 'auth/welcome':
        return 'Bienvenue';
      case 'auth/admin-new-user':
        return data?.user_email ? `Nouveau compte: ${data.user_email}` : 'Nouveau compte créé';
      case 'auth/reset-request':
        return 'Réinitialisation du mot de passe';
      case 'auth/password-changed':
        return 'Mot de passe mis à jour';
      case 'contact/contact-notification':
        return 'Nouveau message de contact';
      case 'contact/contact-confirmation':
        return 'Nous avons bien reçu votre message';
      case 'booking/booking-notification':
        return 'Nouvelle réservation confirmée';
      case 'booking/booking-confirmation':
        return 'Votre réservation est confirmée';
      case 'demo/demo-request':
        return 'Nouvelle demande de démo';
      case 'demo/demo-confirmation':
        return 'Votre demande de démo';
      case 'feedback/feedback':
        return 'Nouveau retour client';
      case 'support/admin-support':
        return 'Nouveau ticket support';
      case 'support/support-confirmation':
        return 'Ticket reçu';
      case 'deployment/project-published':
        return 'Votre projet est prêt';
      case 'deployment/admin-deployment':
        return 'Déploiement terminé';
      case 'deployment/project-delayed':
        return 'Mise à jour du planning';
      case 'system/system-alert':
        return 'Alerte système';
      default:
        return data?.title || 'Notification';
    }
  }

  function htmlFor(): string {
    switch (template) {
      case 'auth/welcome':
        return renderTemplate('welcome', {
          name: data?.user_name || data?.name || 'Bonjour',
          verifyUrl: data?.verify_url || data?.verifyUrl || '',
        });
      case 'auth/reset-request':
        return renderTemplate('password_reset', { resetUrl: data?.reset_url || data?.resetUrl || '' });
      case 'auth/password-changed':
        return renderTemplate('password_changed', {});
      case 'orders/admin-new-order': {
        const order = {
          order_number: data?.order_number || data?.order?.order_number || '',
          plan: data?.plan || data?.plan_name || data?.order?.plan || '',
          template_key: data?.template_key || data?.template || data?.template_name || '',
          amount_total:
            typeof data?.amount_minor === 'number'
              ? data.amount_minor
              : typeof data?.amount_total === 'number'
              ? data.amount_total
              : Math.round(Number(data?.amount_value || 0) * 100),
          currency: data?.amount_currency || data?.currency || 'CHF',
          customer_name: data?.customer_name || data?.name || '',
          customer_email: data?.customer_email || data?.email || '',
          status: data?.payment_status || data?.status || '',
          stripe_session_id: data?.stripe_session_id || '',
          subscription_id: data?.subscription_id || '',
          metadata: data?.metadata || {},
        };
        return renderTemplate('admin_notification', { order });
      }
      case 'orders/order-confirmation': {
        const order = {
          order_number: data?.order_number || data?.order?.order_number || '',
          plan: data?.plan || data?.plan_name || data?.order?.plan || '',
          template_key: data?.template_key || data?.template || data?.template_name || '',
          amount_total:
            typeof data?.amount_minor === 'number'
              ? data.amount_minor
              : typeof data?.amount_total === 'number'
              ? data.amount_total
              : Math.round(Number(data?.amount_value || 0) * 100),
          currency: data?.amount_currency || data?.currency || 'CHF',
          status: data?.payment_status || data?.status || '',
          metadata: data?.metadata || {},
        };
        return renderTemplate('client_confirmation', { order });
      }
      case 'orders/order-update': {
        const orderNumber = data?.order_number || '';
        const status = data?.new_status || data?.status || '';
        const pre = status ? `${orderNumber ? `Commande ${escapeHtml(orderNumber)} — ` : ''}${escapeHtml(status)}` : '';
        const noteBlock =
          typeof data?.note_block === 'string' && data.note_block
            ? data.note_block
            : data?.note
            ? `<p style="margin:16px 0;"><strong>Commentaire :</strong> ${escapeHtml(String(data.note))}</p>`
            : '';
        const content = `
          <p>Votre commande ${orderNumber ? `<strong>${escapeHtml(orderNumber)}</strong>` : ''} a été mise à jour.</p>
          ${noteBlock}
        `;
        return renderLayout({ title: 'Mise à jour de votre commande', preheader: pre || undefined, contentHtml: content });
      }
      case 'orders/subscription-renewal': {
        const rows = [
          ['Numéro de facture', data?.invoice_number || '—'],
          ['Période de renouvellement', data?.renewal_period || '—'],
          ['Montant', data?.amount_formatted || formatAmountForLocale(data?.amount_minor, data?.amount_currency, locale)],
        ]
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:6px 12px; font-weight:600; width:220px;">${label}</td>
                <td style="padding:6px 12px;">${escapeHtml(String(value))}</td>
              </tr>
            `,
          )
          .join('');
        const content = `
          <p>Merci – votre abonnement a bien été renouvelé.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; font-size:14px; line-height:20px;">
            <tbody>${rows}</tbody>
          </table>
        `;
        return renderLayout({ title: 'Renouvellement de votre abonnement', contentHtml: content });
      }
      case 'orders/subscription-cancelled': {
        const content = `
          <p>Votre abonnement a été annulé${data?.canceled_at ? ` le <strong>${escapeHtml(String(data.canceled_at))}</strong>` : ''}.</p>
          ${data?.cancellation_reason ? `<p>Motif : ${escapeHtml(String(data.cancellation_reason))}</p>` : ''}
        `;
        return renderLayout({ title: 'Abonnement annulé', contentHtml: content });
      }
      case 'subscription_update': {
        return renderTemplate('subscription_update', data);
      }
      case 'contact/contact-notification': {
        const rows = [
          ['Nom', data?.sender_name || '—'],
          ['Email', data?.sender_email || '—'],
          ['Entreprise', data?.sender_company || '—'],
          ['Source', data?.source || '—'],
        ]
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:6px 12px; font-weight:600; width:180px;">${label}</td>
                <td style="padding:6px 12px;">${escapeHtml(String(value))}</td>
              </tr>
            `,
          )
          .join('');
        const content = `
          <p>Nouveau message reçu :</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; font-size:14px; line-height:20px;">
            <tbody>${rows}</tbody>
          </table>
          ${data?.sender_message ? `<blockquote style=\"margin:16px 0; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;\">${escapeHtml(String(data.sender_message))}</blockquote>` : ''}
        `;
        return renderLayout({ title: 'Nouveau message de contact', contentHtml: content });
      }
      case 'contact/contact-confirmation': {
        const content = `
          <p>Merci pour votre message${data?.sender_name ? `, ${escapeHtml(String(data.sender_name))}` : ''}.</p>
          <p>Notre équipe vous répond sous 24 heures (jours ouvrés).</p>
        `;
        return renderLayout({ title: 'Message bien reçu', preheader: 'Nous revenons vite vers vous', contentHtml: content });
      }
      case 'booking/booking-notification': {
        const rows = [
          ['Client', data?.customer_name || '—'],
          ['Email', data?.customer_email || '—'],
          ['Téléphone', data?.customer_phone || '—'],
          ['Service', data?.service || '—'],
          ['Adresse', data?.address || '—'],
          ['Début', data?.start_time || '—'],
          ['Fin', data?.end_time || '—'],
        ]
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:6px 12px; font-weight:600; width:180px;">${label}</td>
                <td style="padding:6px 12px;">${escapeHtml(String(value))}</td>
              </tr>
            `,
          )
          .join('');
        const content = `
          <p>Une nouvelle réservation a été confirmée.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; font-size:14px; line-height:20px;">
            <tbody>${rows}</tbody>
          </table>
          ${data?.notes ? `<blockquote style="margin:16px 0; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">${escapeHtml(String(data.notes))}</blockquote>` : ''}
        `;
        return renderLayout({ title: 'Nouvelle réservation confirmée', contentHtml: content });
      }
      case 'booking/booking-confirmation': {
        const content = `
          <p>Votre réservation est confirmée${data?.customer_name ? `, ${escapeHtml(String(data.customer_name))}` : ''}.</p>
          <p><strong>Service :</strong> ${escapeHtml(String(data?.service || '—'))}</p>
          <p><strong>Créneau :</strong> ${escapeHtml(String(data?.start_time || '—'))} → ${escapeHtml(String(data?.end_time || '—'))}</p>
          <p>Merci pour votre confiance. Nous restons disponibles si vous avez des questions.</p>
        `;
        return renderLayout({ title: 'Réservation confirmée', preheader: 'Merci pour votre réservation', contentHtml: content });
      }
      case 'feedback/feedback': {
        return renderTemplate('feedback_notification', {
          project: data?.project_name || data?.project || 'Projet',
          author: data?.feedback_author || data?.author || '',
          message: data?.feedback_message || data?.message || '',
        });
      }
      case 'support/admin-support': {
        return renderTemplate('support_ticket', {
          ticketId: data?.ticket_id || data?.ticketId || '#',
          summary: data?.ticket_summary || data?.summary || 'Nouveau ticket',
          customerName: data?.customer_name || data?.customerName || '',
          priority: data?.ticket_priority || data?.priority || 'normal',
        });
      }
      case 'support/support-confirmation': {
        const content = `
          <p>Nous avons bien reçu votre demande${data?.ticket_id ? ` (#${escapeHtml(String(data.ticket_id))})` : ''}.</p>
          <p>Notre équipe support revient vers vous dans les meilleurs délais.</p>
        `;
        return renderLayout({ title: 'Votre ticket a été reçu', contentHtml: content });
      }
      case 'deployment/project-published': {
        return renderTemplate('project_ready', {
          projectName: data?.project_name || data?.projectName || 'Votre projet',
          previewUrl: data?.preview_url || data?.previewUrl || '',
        });
      }
      case 'deployment/admin-deployment': {
        const content = `
          <p>Un déploiement vient de se terminer pour <strong>${escapeHtml(
            data?.project_name || data?.projectName || 'Projet',
          )}</strong>.</p>
          ${data?.preview_url ? `<p><a href="${escapeHtml(String(data.preview_url))}" target="_blank" rel="noopener">Ouvrir l'aperçu →</a></p>` : ''}
        `;
        return renderLayout({ title: 'Déploiement terminé', contentHtml: content });
      }
      case 'deployment/project-delayed': {
        return renderTemplate('project_delayed', {
          projectName: data?.project_name || data?.projectName || 'Votre projet',
          newEta: data?.new_eta || data?.newEta || 'bientôt',
        });
      }
      case 'system/system-alert': {
        const content = `
          <p><strong>${escapeHtml(String(data?.alert_subject || 'Alerte'))}</strong></p>
          <pre style="white-space:pre-wrap; background:#0f172a; color:#e2e8f0; padding:12px; border-radius:8px;">${escapeHtml(
            String(data?.alert_body || JSON.stringify(data, null, 2)),
          )}</pre>
        `;
        return renderLayout({ title: 'Alerte système', contentHtml: content });
      }
      default: {
        const content = typeof data?.html === 'string' ? data.html : `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
        return renderLayout({ title: data?.title || 'Notification', preheader: data?.preheader || undefined, contentHtml: content, cta: data?.cta || null });
      }
    }
  }

  return { subject: subjectFor(), html: htmlFor() };
}
