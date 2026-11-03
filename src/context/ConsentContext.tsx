import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { applyConsent, defaultConsent, readConsent, saveConsent } from '../lib/consent';
import type { ConsentChoice, ConsentRecord } from '../lib/consent';

type ConsentValue = {
  consent: ConsentRecord | null;
  decided: boolean;
  preferencesOpen: boolean;
  save: (choice: ConsentChoice) => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const ConsentContext = createContext<ConsentValue | null>(null);

export function ConsentProvider({ children }: PropsWithChildren) {
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoice>(() => defaultConsent());

  useEffect(() => {
    applyConsent(consent ?? defaultConsent());
  }, [consent]);

  const save = useCallback((choice: ConsentChoice) => {
    setConsent(saveConsent(choice));
    setPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback(() => {
    setDraft({ analytics: consent?.analytics === true, marketing: consent?.marketing === true, necessary: true });
    setPreferencesOpen(true);
  }, [consent]);

  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  useEffect(() => {
    if (!preferencesOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreferencesOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preferencesOpen]);

  const value = useMemo(
    () => ({ consent, decided: Boolean(consent), preferencesOpen, save, openPreferences, closePreferences }),
    [consent, preferencesOpen, save, openPreferences, closePreferences]
  );

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectNonEssential = () => save({ necessary: true, analytics: false, marketing: false });

  return <ConsentContext.Provider value={value}>
    {children}
    {!consent && !preferencesOpen && <div className="cookie-banner" role="dialog" aria-modal="false" aria-label="Cookie consent">
      <div className="cookie-banner-copy">
        <strong>Your privacy choices</strong>
        <p>We use essential cookies to run the store. With your permission we also use analytics and advertising cookies to understand traffic and measure campaigns. You can change your choice any time. Read our <Link to="/privacy-policy">Privacy Policy</Link> and <Link to="/cookie-policy">Cookie Policy</Link>.</p>
      </div>
      <div className="cookie-banner-actions">
        <button type="button" className="cookie-btn primary" onClick={acceptAll}>Accept all</button>
        <button type="button" className="cookie-btn" onClick={rejectNonEssential}>Reject non-essential</button>
        <button type="button" className="cookie-btn text" onClick={openPreferences}>Customize</button>
      </div>
    </div>}
    {preferencesOpen && <div className="cookie-backdrop" role="presentation" onClick={() => setPreferencesOpen(false)}>
      <div className="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" onClick={(event) => event.stopPropagation()}>
        <div className="cookie-modal-head">
          <div><p className="eyebrow">PRIVACY CONTROLS</p><h2 id="cookie-preferences-title">Cookie preferences</h2></div>
          <button type="button" className="cookie-close" onClick={closePreferences} aria-label="Close cookie preferences">×</button>
        </div>
        <p className="cookie-modal-lead">Choose which optional cookies we may use. Essential cookies are always on because the store cannot work without them.</p>
        <div className="cookie-option">
          <div><strong>Strictly necessary</strong><small>Login sessions, cart, checkout security and abuse prevention. Always active.</small></div>
          <span className="cookie-locked">Always on</span>
        </div>
        <label className="cookie-option">
          <div><strong>Analytics</strong><small>Google Analytics, when configured, to understand page views, popular products and traffic sources. Off by default.</small></div>
          <input type="checkbox" checked={draft.analytics} onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))}/>
        </label>
        <label className="cookie-option">
          <div><strong>Advertising</strong><small>Google Ads and Meta Pixel, when configured, to measure conversions and show relevant advertising. Off by default.</small></div>
          <input type="checkbox" checked={draft.marketing} onChange={(event) => setDraft((current) => ({ ...current, marketing: event.target.checked }))}/>
        </label>
        <div className="cookie-modal-actions">
          <button type="button" className="cookie-btn" onClick={rejectNonEssential}>Reject non-essential</button>
          <button type="button" className="cookie-btn primary" onClick={() => save(draft)}>Save preferences</button>
          <button type="button" className="cookie-btn" onClick={acceptAll}>Accept all</button>
        </div>
        <p className="cookie-modal-note">You can reopen these settings any time from “Cookie preferences” in the footer. See the <Link to="/cookie-policy">Cookie Policy</Link> for the full list.</p>
      </div>
    </div>}
  </ConsentContext.Provider>;
}

export function useConsent(): ConsentValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent must be used within ConsentProvider');
  return value;
}
