export function catchAsync(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err && err.message ? err.message : 'Internal Error';
      return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
  };
}

