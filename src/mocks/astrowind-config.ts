// src/mocks/astrowind-config.ts
// Defensive mock for Astrowind config so build never crashes.

// Match the shape expected by the integration-generated virtual module
export const SITE = {
  name: "Pedro Déménagement",
  site: "http://www.pedrodemenagement.ch",
  base: "/",
  trailingSlash: false,
  googleSiteVerificationId: "",
};

export const UI = { theme: "light" };

export const I18N = {
  language: "fr",
  textDirection: "ltr",
};

// 🛡 prevent undefined crash
export const APP_BLOG = {
  isEnabled: false,
  postsPerPage: 0,
  isRelatedPostsEnabled: false,
  relatedPostsCount: 0,
  post: { isEnabled: false, permalink: "/blog/%slug%", robots: { index: true, follow: true } },
  list: { isEnabled: false, pathname: "blog", robots: { index: true, follow: true } },
  category: { isEnabled: false, pathname: "category", robots: { index: true, follow: true } },
  tag: { isEnabled: false, pathname: "tag", robots: { index: false, follow: true } },
};

export const METADATA = {};
export const ANALYTICS = {};

export default {
  SITE,
  UI,
  I18N,
  APP_BLOG,
  METADATA,
  ANALYTICS,
};
