import { hasConsent } from './consent';

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

/**
 * Lightweight analytics bridge. Pushes to window.dataLayer only when the
 * visitor has granted analytics consent, and always emits a DOM event so
 * internal listeners can react without any third party.
 */
export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  const event = { event: name, ...payload };
  if (hasConsent('analytics')) {
    const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    if (Array.isArray(dataLayer)) dataLayer.push(event);
  }
  window.dispatchEvent(new CustomEvent('spidy:analytics', { detail: event }));
}
