const CLIENT_ID_KEY = "tp_client_id";

/**
 * A per-browser id, so repeat clicks from one person can be collapsed.
 *
 * Not an identity and not persisted anywhere but this browser: it is hashed
 * server-side into a dedupe key and never stored as given. Clearing site data
 * mints a new one, which is the correct privacy property — this exists to stop
 * one person's indecision reading as ten people's interest, nothing more.
 *
 * Keyed by browser rather than by IP because the frontend proxies API calls
 * through Next's rewrite: the backend sees one address for every visitor, so
 * an IP-keyed dedupe would collapse an entire day into a single row.
 */
function getClientId(): string {
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    // Private mode, or storage disabled. A per-call id means this click cannot
    // be deduped against the next, which overcounts slightly — far better than
    // losing the measurement or throwing inside a click handler.
    return crypto.randomUUID();
  }
}

/**
 * Records a CTA click. Fire-and-forget, never awaited.
 *
 * sendBeacon so the request survives the navigation to WhatsApp that is about
 * to happen — a plain fetch is cancelled when the page goes away, which is
 * exactly the moment we want to measure.
 *
 * The Blob is load-bearing: sendBeacon(url, string) sends text/plain, which
 * Nest's body parser rejects with a 400 nobody would ever see, because beacon
 * results are unobservable by design.
 */
export function trackCtaClick(kind: "whatsapp" | "reserve_start", planId?: string): void {
  try {
    const body = JSON.stringify({ kind, planId: planId ?? null, clientId: getClientId() });
    const url = "/api/backend/funnel/cta-click";

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(url, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Telemetry must never break the thing it is measuring.
  }
}
