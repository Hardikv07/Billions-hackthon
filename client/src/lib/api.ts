// In production (Vercel) VITE_API_URL points directly to the Render backend.
// In local dev it falls back to '/api' which the vite dev-server proxies to localhost:5050.
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const tokenStore = {
  get: () => localStorage.getItem('nirman.token'),
  set: (t: string) => localStorage.setItem('nirman.token', t),
  clear: () => localStorage.removeItem('nirman.token'),
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = 'Something went wrong. Please retry.';
    try { message = (await res.json()).error ?? message; } catch { /* keep default */ }
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Turn anything thrown by the API layer into a sentence a person can act on. */
export function humanError(e: unknown, fallback = 'Something went wrong. Please try again.') {
  if (e instanceof ApiError) return e.message;
  if (e instanceof TypeError) return "We couldn't reach the server. Check your connection and try again.";
  return fallback;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) });
export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
