export const SITE = {
  name: 'Tolo Coiffure',
  site: 'https://tolocoiffure.ch',
  base: '/',
  trailingSlash: false,
  googleSiteVerificationId: '',
};

export const UI = { theme: 'light' };

export const I18N = {
  language: 'fr',
  textDirection: 'ltr',
};

export const APP_BLOG = {
  isEnabled: false,
  postsPerPage: 0,
  isRelatedPostsEnabled: false,
  relatedPostsCount: 0,
  post: { isEnabled: false, permalink: '/blog/%slug%', robots: { index: true, follow: true } },
  list: { isEnabled: false, pathname: 'blog', robots: { index: true, follow: true } },
  category: { isEnabled: false, pathname: 'category', robots: { index: true, follow: true } },
  tag: { isEnabled: false, pathname: 'tag', robots: { index: false, follow: true } },
};

export const METADATA = {
  title: {
    default: 'Tolo Coiffure',
    template: '%s | Tolo Coiffure',
  },
  description:
    'Salon de coiffure a Lausanne. Balayage, coloration, coupes femme et homme, soins profonds et reservation en ligne.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    site_name: 'Tolo Coiffure',
    type: 'website',
    images: [],
  },
  twitter: {
    cardType: 'summary_large_image',
  },
};

export const ANALYTICS = {};

export default {
  SITE,
  UI,
  I18N,
  APP_BLOG,
  METADATA,
  ANALYTICS,
};
