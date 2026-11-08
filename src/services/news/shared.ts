/** Small helpers shared by every provider adapter, so each one stays about the mapping, not plumbing. */

export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

/** `YYYY-MM-DD` to `YYYYMMDD`, the date format the NYT API expects. */
export function toCompactDate(date: string): string {
  return date.replaceAll('-', '');
}
