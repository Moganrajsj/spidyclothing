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

/** Multipart upload with real progress events (fetch cannot report upload progress). */
export function adminUpload<T = any>(path: string, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `/api/admin${path}`);
    request.withCredentials = true;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let body: any = {};
      try { body = JSON.parse(request.responseText); } catch { /* ignore non-JSON errors */ }
      if (request.status >= 200 && request.status < 300) resolve(body as T);
      else reject(new Error(body.error || `Upload failed (${request.status}).`));
    };
    request.onerror = () => reject(new Error('Network error while uploading. Please check your connection.'));
    request.ontimeout = () => reject(new Error('The upload timed out. Please try again.'));
    request.send(form);
  });
}

export const jsonBody = (body: unknown) => JSON.stringify(body);
