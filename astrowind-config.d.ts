declare module 'astrowind:config' {
  export const SITE: {
    name: string;
    site: string;
    base: string;
    trailingSlash: boolean;
    googleSiteVerificationId: string;
  };

  export const UI: {
    theme: string;
  };

  export const I18N: {
    language: string;
    textDirection: 'ltr' | 'rtl';
  };

  export const APP_BLOG: {
    isEnabled: boolean;
    postsPerPage: number;
    isRelatedPostsEnabled: boolean;
    relatedPostsCount: number;
    post: { isEnabled: boolean; permalink: string; robots: { index: boolean; follow: boolean } };
    list: { isEnabled: boolean; pathname: string; robots: { index: boolean; follow: boolean } };
    category: { isEnabled: boolean; pathname: string; robots: { index: boolean; follow: boolean } };
    tag: { isEnabled: boolean; pathname: string; robots: { index: boolean; follow: boolean } };
  };

  export const METADATA: {
    title?: {
      default?: string;
      template?: string;
    };
    description?: string;
    robots?: {
      index?: boolean;
      follow?: boolean;
    };
    openGraph?: Record<string, unknown>;
    twitter?: Record<string, unknown>;
  };

  export const ANALYTICS: {
    vendors?: {
      googleAnalytics?: {
        id?: string;
        partytown?: boolean;
      };
    };
  };
}
