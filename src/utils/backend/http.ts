// src/utils/backend/http.ts

export class ApiError extends Error {
  status: number;

  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

function serialize(data: unknown) {
  return JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export function jsonResponse<T>(status: number, body: T): Response {
  return new Response(serialize(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export function ok<T>(body: T): Response {
  return jsonResponse(200, body);
}

export function created<T>(body: T): Response {
  return jsonResponse(201, body);
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(status: number, message: string, details?: unknown): Response {
  const payload = details ? { error: message, details } : { error: message };
  return jsonResponse(status, payload);
}

export function badRequest(message: string, details?: unknown): Response {
  return errorResponse(400, message, details);
}

export function notFound(message: string): Response {
  return errorResponse(404, message);
}

export function serviceUnavailable(message: string): Response {
  return errorResponse(503, message);
}

export function handleApiError(error: unknown, fallbackMessage: string): Response {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.message, error.details);
  }

  console.error(fallbackMessage, error);
  return errorResponse(500, 'Unexpected server error');
}
