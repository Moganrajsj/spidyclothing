export async function adminApi<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json');
  const response = await fetch(`/api/admin${path}`, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  if (response.headers.get('content-type')?.includes('text/csv')) return await response.blob() as T;
  return response.json();
}
export const jsonBody = (body: unknown) => JSON.stringify(body);
