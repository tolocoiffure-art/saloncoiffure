import slugify from 'limax';

import { SITE } from 'astrowind:config';

import { trim } from '~/utils/utils';

export const trimSlash = (value: string) => trim(trim(value, '/'));

const createPath = (...parts: string[]) => {
  const path = parts
    .map((part) => trimSlash(part))
    .filter(Boolean)
    .join('/');

  return '/' + path + (SITE.trailingSlash && path ? '/' : '');
};

const BASE_PATHNAME = SITE.base || '/';

export const cleanSlug = (text = '') =>
  trimSlash(text)
    .split('/')
    .map((part) => slugify(part))
    .join('/');

export const getCanonical = (path = ''): string | URL => {
  const url = String(new URL(path, SITE.site));
  if (SITE.trailingSlash === false && path && url.endsWith('/')) return url.slice(0, -1);
  if (SITE.trailingSlash === true && path && !url.endsWith('/')) return `${url}/`;
  return url;
};

export const getPermalink = (slug = '', type = 'page'): string => {
  if (
    slug.startsWith('https://') ||
    slug.startsWith('http://') ||
    slug.startsWith('://') ||
    slug.startsWith('#') ||
    slug.startsWith('javascript:')
  ) {
    return slug;
  }

  const permalink = type === 'home' ? createPath('/') : type === 'asset' ? getAsset(slug) : createPath(slug);
  return createPath(BASE_PATHNAME, permalink);
};

export const getHomePermalink = (): string => getPermalink('/', 'home');

export const getAsset = (path: string): string =>
  '/' +
  [BASE_PATHNAME, path]
    .map((part) => trimSlash(part))
    .filter(Boolean)
    .join('/');

export const applyGetPermalinks = (menu: object = {}) => {
  if (Array.isArray(menu)) {
    return menu.map((item) => applyGetPermalinks(item));
  }

  if (typeof menu === 'object' && menu !== null) {
    const output = {};

    for (const key in menu) {
      if (key === 'href') {
        if (typeof menu[key] === 'string') {
          output[key] = getPermalink(menu[key]);
        } else if (typeof menu[key] === 'object') {
          if (menu[key].type === 'home') {
            output[key] = getHomePermalink();
          } else if (menu[key].type === 'asset') {
            output[key] = getAsset(menu[key].url);
          } else if (menu[key].url) {
            output[key] = getPermalink(menu[key].url, menu[key].type);
          }
        }
      } else {
        output[key] = applyGetPermalinks(menu[key]);
      }
    }

    return output;
  }

  return menu;
};
