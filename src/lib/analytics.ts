type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

/**
 * Lightweight analytics bridge. Pushes to window.dataLayer when a tag manager
 * is present and always emits a DOM event so other listeners can react.
 */
export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  const event = { event: name, ...payload };
  const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) dataLayer.push(event);
  window.dispatchEvent(new CustomEvent('spidy:analytics', { detail: event }));
}
