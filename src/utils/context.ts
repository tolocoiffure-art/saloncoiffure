// src/utils/backend/context.ts
export const backendContext = {
  initialized: true,
  env: import.meta.env.MODE || 'production'
};
