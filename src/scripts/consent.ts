export interface Consent {
  analytics: boolean;
  media: boolean;
  date: string;
}
const KEY = 'sparkle-consent';

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function setConsent(c: Omit<Consent, 'date'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...c, date: new Date().toISOString() }));
  } catch {
    /* storage blocked: banner will simply show again next time */
  }
  window.dispatchEvent(new CustomEvent('consent:change'));
}
