// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite/client" />
/// <reference types="../vendor/integration/types.d.ts" />

import type { TenantContext } from './lib/tenants';

declare namespace App {
  interface Locals {
    tenant?: TenantContext;
  }
}
