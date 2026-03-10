import TonHomeFr from '~/pages/tonsiteweb/index.astro';
import TonHomeEn from '~/pages/tonsiteweb/en/index.astro';
import TonHomeDe from '~/pages/tonsiteweb/de/index.astro';
import TonHomeIt from '~/pages/tonsiteweb/it/index.astro';

import TonPricingFr from '~/pages/tonsiteweb/pricing.astro';
import TonPricingEn from '~/pages/tonsiteweb/en/pricing.astro';
import TonPricingDe from '~/pages/tonsiteweb/de/pricing.astro';
import TonPricingIt from '~/pages/tonsiteweb/it/pricing.astro';

import TonServicesFr from '~/pages/tonsiteweb/services.astro';
import TonServicesEn from '~/pages/tonsiteweb/en/services.astro';
import TonServicesDe from '~/pages/tonsiteweb/de/services.astro';
import TonServicesIt from '~/pages/tonsiteweb/it/services.astro';

import TonContactFr from '~/pages/tonsiteweb/contact.astro';
import TonContactEn from '~/pages/tonsiteweb/en/contact.astro';
import TonContactDe from '~/pages/tonsiteweb/de/contact.astro';
import TonContactIt from '~/pages/tonsiteweb/it/contact.astro';

import TonAboutFr from '~/pages/tonsiteweb/about.astro';
import TonAboutEn from '~/pages/tonsiteweb/en/about.astro';
import TonAboutDe from '~/pages/tonsiteweb/de/about.astro';
import TonAboutIt from '~/pages/tonsiteweb/it/about.astro';

import TonThankYouFr from '~/pages/tonsiteweb/thank-you.astro';
import TonThankYouEn from '~/pages/tonsiteweb/en/thank-you.astro';
import TonThankYouDe from '~/pages/tonsiteweb/de/thank-you.astro';
import TonThankYouIt from '~/pages/tonsiteweb/it/thank-you.astro';

import TonChooseTemplateFr from '~/pages/tonsiteweb/choose-template.astro';
import TonChooseTemplateEn from '~/pages/tonsiteweb/en/choose-template.astro';
import TonChooseTemplateDe from '~/pages/tonsiteweb/de/choose-template.astro';
import TonChooseTemplateIt from '~/pages/tonsiteweb/it/choose-template.astro';

import TonTermsFr from '~/pages/tonsiteweb/terms.md';
import TonTermsEn from '~/pages/tonsiteweb/en/terms.md';
import TonTermsDe from '~/pages/tonsiteweb/de/terms.md';
import TonTermsIt from '~/pages/tonsiteweb/it/terms.md';

import TonPrivacyFr from '~/pages/tonsiteweb/privacy.md';
import TonPrivacyEn from '~/pages/tonsiteweb/en/privacy.md';
import TonPrivacyDe from '~/pages/tonsiteweb/de/privacy.md';
import TonPrivacyIt from '~/pages/tonsiteweb/it/privacy.md';

type Locale = 'fr' | 'en' | 'de' | 'it';

type PageKey =
  | 'home'
  | 'pricing'
  | 'services'
  | 'contact'
  | 'about'
  | 'thank-you'
  | 'choose-template'
  | 'terms'
  | 'privacy';

type TonComponent = (props?: Record<string, unknown>) => Promise<unknown> | unknown;

const pages: Record<PageKey, Record<Locale, TonComponent>> = {
  home: { fr: TonHomeFr, en: TonHomeEn, de: TonHomeDe, it: TonHomeIt },
  pricing: { fr: TonPricingFr, en: TonPricingEn, de: TonPricingDe, it: TonPricingIt },
  services: { fr: TonServicesFr, en: TonServicesEn, de: TonServicesDe, it: TonServicesIt },
  contact: { fr: TonContactFr, en: TonContactEn, de: TonContactDe, it: TonContactIt },
  about: { fr: TonAboutFr, en: TonAboutEn, de: TonAboutDe, it: TonAboutIt },
  'thank-you': { fr: TonThankYouFr, en: TonThankYouEn, de: TonThankYouDe, it: TonThankYouIt },
  'choose-template': {
    fr: TonChooseTemplateFr,
    en: TonChooseTemplateEn,
    de: TonChooseTemplateDe,
    it: TonChooseTemplateIt,
  },
  terms: { fr: TonTermsFr, en: TonTermsEn, de: TonTermsDe, it: TonTermsIt },
  privacy: { fr: TonPrivacyFr, en: TonPrivacyEn, de: TonPrivacyDe, it: TonPrivacyIt },
};

function resolveLocale(pathname: string, request?: Request): Locale {
  const match = pathname.match(/^\/(fr|en|de|it)(?=\/|$)/);
  if (match?.[1]) return match[1] as Locale;

  const supported: Locale[] = ['fr', 'en', 'de', 'it'];
  const cookie = request?.headers.get('cookie') || '';
  const langCookie = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('aw_lang='));
  const cookieLang = langCookie ? (langCookie.split('=')[1] as Locale) : undefined;
  if (cookieLang && supported.includes(cookieLang)) return cookieLang;

  const accept = (request?.headers.get('accept-language') || '').slice(0, 2).toLowerCase() as Locale;
  if (accept && supported.includes(accept)) return accept;

  return 'fr';
}

export function resolveTonSiteWebComponent(page: PageKey, url: URL, request?: Request): TonComponent {
  const locale = resolveLocale(url.pathname, request);
  const table = pages[page];
  return table[locale] || table.fr;
}
