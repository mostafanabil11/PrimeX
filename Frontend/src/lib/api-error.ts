// Pulls a usable message out of an Axios error without reaching for `any`.
//
// The API returns two shapes. Ordinary failures carry a `message` string.
// Validation failures carry an `error` array of { field, message } — far more
// useful than the generic "Validation failed" that sits in `message`, so the
// first field error wins when one is present.
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown; error?: unknown } } })?.response
    ?.data;

  if (Array.isArray(data?.error)) {
    const first = data.error[0] as { field?: string; message?: string } | undefined;
    if (first?.message) {
      return first.field ? `${first.field}: ${first.message}` : first.message;
    }
  }

  return typeof data?.message === "string" ? data.message : fallback;
}

// Some callers branch on the status — a 409 on checkout means the cart moved,
// a 429 means slow down — so it needs reading without casting at the call site.
export function apiErrorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}
