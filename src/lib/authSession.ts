let onUnauthorized: (() => void) | null = null;

/** Register a callback for when the API returns 401 with a bearer token (session expired or invalid). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function notifyUnauthorized() {
  try {
    onUnauthorized?.();
  } catch (e) {
    console.error('[api] onUnauthorized failed', e);
  }
}
