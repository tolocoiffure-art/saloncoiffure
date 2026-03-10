// Simple client-side i18n helper for backend UI

const SUPPORTED = ['fr', 'en', 'de', 'it'] as const;
export type LocaleCode = (typeof SUPPORTED)[number];

const translations: Record<LocaleCode, Record<string, string>> = {
  fr: {
    'nav.languageLabel': 'Langue',
    'nav.overview': 'Vue d’ensemble',
    'nav.leads': 'Leads',
    'nav.clients': 'Clients',
    'nav.projects': 'Projets',
    'nav.websites': 'Sites web',
    'nav.tasks': 'Tâches',
    'nav.documents': 'Documents',
    'nav.invoices': 'Factures',
    'nav.orders': 'Commandes',
    'nav.support': 'Support',
    'nav.subscriptions': 'Abonnements',
    'nav.settings': 'Paramètres',
    'auth.signout': 'Se déconnecter',
    'auth.checking': 'Vérification de session…',
  },
  en: {
    'nav.languageLabel': 'Language',
    'nav.overview': 'Overview',
    'nav.leads': 'Leads',
    'nav.clients': 'Clients',
    'nav.projects': 'Projects',
    'nav.websites': 'Websites',
    'nav.tasks': 'Tasks',
    'nav.documents': 'Documents',
    'nav.invoices': 'Invoices',
    'nav.orders': 'Orders',
    'nav.support': 'Support',
    'nav.subscriptions': 'Subscriptions',
    'nav.settings': 'Settings',
    'auth.signout': 'Sign out',
    'auth.checking': 'Checking session…',
  },
  de: {
    'nav.languageLabel': 'Sprache',
    'nav.overview': 'Übersicht',
    'nav.leads': 'Leads',
    'nav.clients': 'Kunden',
    'nav.projects': 'Projekte',
    'nav.websites': 'Websites',
    'nav.tasks': 'Aufgaben',
    'nav.documents': 'Dokumente',
    'nav.invoices': 'Rechnungen',
    'nav.orders': 'Bestellungen',
    'nav.support': 'Support',
    'nav.subscriptions': 'Abos',
    'nav.settings': 'Einstellungen',
    'auth.signout': 'Abmelden',
    'auth.checking': 'Sitzung wird geprüft…',
  },
  it: {
    'nav.languageLabel': 'Lingua',
    'nav.overview': 'Panoramica',
    'nav.leads': 'Lead',
    'nav.clients': 'Clienti',
    'nav.projects': 'Progetti',
    'nav.websites': 'Siti web',
    'nav.tasks': 'Attività',
    'nav.documents': 'Documenti',
    'nav.invoices': 'Fatture',
    'nav.orders': 'Ordini',
    'nav.support': 'Supporto',
    'nav.subscriptions': 'Abbonamenti',
    'nav.settings': 'Impostazioni',
    'auth.signout': 'Disconnetti',
    'auth.checking': 'Verifica sessione…',
  },
};

function normalizeLocale(input?: string | null): LocaleCode {
  const lower = String(input || '').toLowerCase();
  if ((SUPPORTED as readonly string[]).includes(lower)) return lower as LocaleCode;
  return 'fr';
}

export function getPreferredLocale(): LocaleCode {
  // Path prefix wins if present
  try {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const match = path.match(/^\/(fr|en|de|it)(?=\/|$)/);
      if (match && match[1]) {
        const normalized = normalizeLocale(match[1]);
        localStorage.setItem('preferredLang', normalized);
        return normalized;
      }
    }
  } catch (_) {
    // ignore
  }

  // URL param takes precedence in browser
  try {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const queryLang = url.searchParams.get('lang');
      if (queryLang) {
        const normalized = normalizeLocale(queryLang);
        localStorage.setItem('preferredLang', normalized);
        return normalized;
      }
    }
  } catch (_) {
    // ignore
  }

  try {
    const stored = localStorage.getItem('preferredLang');
    if (stored) return normalizeLocale(stored);
  } catch (_) {
    // ignore storage issues
  }
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language?.slice(0, 2) || '';
    if (nav) return normalizeLocale(nav);
  }
  return 'fr';
}

export function setPreferredLocale(locale: LocaleCode) {
  try {
    localStorage.setItem('preferredLang', locale);
  } catch (_) {
    // ignore storage issues
  }
}

export function applyTranslations(locale: LocaleCode) {
  const dict = translations[locale] || translations.fr;
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n') || '';
    if (!key) return;
    const text = dict[key] ?? null;
    if (text !== null) {
      el.textContent = text;
    }
  });
}

export function getLanguageLabel(locale: LocaleCode) {
  const dict = translations[locale] || translations.fr;
  return dict['nav.languageLabel'] || 'Langue';
}
