/**
 * Central consent management for SPIDY CLOTHING.
 *
 * - Consent is stored in localStorage under `spidy-consent-v1`.
 * - Google Consent Mode defaults to "denied" before any Google tag loads.
 * - Google Analytics / Google Ads / Meta Pixel are only loaded when their
 *   environment IDs are configured AND the matching consent is granted.
 * - No tracker is loaded on first visit before the visitor makes a choice.
 */

export const CONSENT_STORAGE_KEY = 'spidy-consent-v1';
export const CONSENT_VERSION = 1;

export type ConsentChoice = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentRecord = ConsentChoice & {
  version: number;
  updatedAt: string;
};

type TrackedWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string };
  _fbq?: unknown;
};

const GOOGLE_ANALYTICS_ID = (import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '').trim();
const GOOGLE_ADS_ID = (import.meta.env.VITE_GOOGLE_ADS_ID || '').trim();
const META_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID || '').trim();

const configuredGoogleIds = new Set<string>();
let googleDefaultsApplied = false;
let googleTagRequested = false;
let metaPixelRequested = false;
let metaPixelConfigured = false;

export const trackerConfig = {
  googleAnalytics: Boolean(GOOGLE_ANALYTICS_ID),
  googleAds: Boolean(GOOGLE_ADS_ID),
  metaPixel: Boolean(META_PIXEL_ID),
};

export function defaultConsent(): ConsentChoice {
  return { necessary: true, analytics: false, marketing: false };
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      version: CONSENT_VERSION,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

export function hasConsent(category: 'analytics' | 'marketing'): boolean {
  const record = readConsent();
  return record ? record[category] === true : false;
}

export function saveConsent(choice: ConsentChoice): ConsentRecord {
  const record: ConsentRecord = {
    necessary: true,
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage may be unavailable (private mode); consent still applies for this visit */
  }
  applyConsent(record);
  return record;
}

export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  applyConsent(defaultConsent());
}

/** Google Consent Mode defaults; must run before any Google tag script loads. */
export function ensureGoogleConsentDefaults(): void {
  if (googleDefaultsApplied || (!GOOGLE_ANALYTICS_ID && !GOOGLE_ADS_ID)) return;
  googleDefaultsApplied = true;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
}

function gtag(...args: unknown[]): void {
  const tracked = window as TrackedWindow;
  tracked.dataLayer = tracked.dataLayer || [];
  tracked.dataLayer.push(args);
  tracked.gtag = gtag;
}

function loadGoogleTag(): void {
  if (googleTagRequested) return;
  const id = GOOGLE_ANALYTICS_ID || GOOGLE_ADS_ID;
  if (!id) return;
  googleTagRequested = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  gtag('js', new Date());
}

function configureGoogleId(id: string): void {
  if (!id || configuredGoogleIds.has(id)) return;
  configuredGoogleIds.add(id);
  gtag('config', id);
}

function loadMetaPixel(): void {
  if (!META_PIXEL_ID) return;
  const tracked = window as TrackedWindow;
  if (!metaPixelRequested) {
    metaPixelRequested = true;
    if (!tracked.fbq) {
      const fbq = ((...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else (fbq.queue = fbq.queue || []).push(args);
      }) as NonNullable<TrackedWindow['fbq']>;
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = '2.0';
      tracked.fbq = fbq;
      tracked._fbq = fbq;
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
  }
  tracked.fbq?.('consent', 'grant');
  if (!metaPixelConfigured) {
    metaPixelConfigured = true;
    tracked.fbq?.('init', META_PIXEL_ID);
    tracked.fbq?.('track', 'PageView');
  }
}

/** Applies a consent record to Consent Mode and loads only approved trackers. */
export function applyConsent(record: ConsentChoice): void {
  const analytics = record.analytics === true;
  const marketing = record.marketing === true;

  if (GOOGLE_ANALYTICS_ID || GOOGLE_ADS_ID) {
    ensureGoogleConsentDefaults();
    gtag('consent', 'update', {
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
      analytics_storage: analytics ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
    if (analytics || marketing) loadGoogleTag();
    if (analytics) configureGoogleId(GOOGLE_ANALYTICS_ID);
    if (marketing) configureGoogleId(GOOGLE_ADS_ID);
  }

  if (marketing) loadMetaPixel();
  else {
    const tracked = window as TrackedWindow;
    if (tracked.fbq) {
      tracked.fbq('consent', 'revoke');
      // Keep the pixel object so it can be granted again without re-creating it,
      // but do not fire new events while consent is revoked.
    }
  }

  trackConsentUpdate(record);
}

const GA_EVENT_NAMES = new Set(['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'select_item', 'search']);
const META_EVENT_NAMES = new Set(['page_view', 'view_content', 'add_to_cart', 'initiate_checkout', 'purchase', 'search']);

/** Sends a consent change to approved Google/Meta destinations only. */
function trackConsentUpdate(record: ConsentChoice): void {
  const tracked = window as TrackedWindow;
  if (record.analytics && tracked.gtag) tracked.gtag('event', 'consent_update', { analytics: true });
  if (record.marketing && tracked.fbq) tracked.fbq('trackCustom', 'ConsentUpdate');
}

/**
 * Optional convenience bridge used by future analytics calls. It never loads
 * a tracker and refuses to send events without the matching consent.
 */
export function consentedEvent(name: string, payload: Record<string, unknown> = {}): void {
  const tracked = window as TrackedWindow;
  if (hasConsent('analytics') && tracked.gtag && GA_EVENT_NAMES.has(name)) tracked.gtag('event', name, payload);
  if (hasConsent('marketing') && tracked.fbq && META_EVENT_NAMES.has(name)) tracked.fbq('track', name, payload);
}

// Apply Consent Mode defaults as early as possible (before any tag loads).
if (typeof window !== 'undefined') ensureGoogleConsentDefaults();
