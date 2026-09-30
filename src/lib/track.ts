/**
 * Sends an event to Google Analytics, only if GA is loaded (i.e. the visitor accepted cookies).
 * Without consent this does nothing.
 */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", event, params);
}
