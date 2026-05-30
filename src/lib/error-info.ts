/**
 * Extract a useful error summary from a caught value of unknown shape.
 *
 * Tool handlers that batch operations (e.g., `toast_bulk_update_stock`) need to
 * surface per-item failures to the MCP caller without crashing the whole call.
 * The previous pattern (`err?.message ?? String(err)`) loses Axios's HTTP
 * status and response body — meaningful signal for distinguishing "401 across
 * the board" (auth misconfig) from "one 404" (deleted item). For network-level
 * Axios errors (no response), `err.code` (e.g., `ECONNREFUSED`) is the only
 * non-message signal that distinguishes a fleet-wide outage from a per-item app
 * error, so we surface that too.
 *
 * Returned shape is flat so callers can spread it into their result objects:
 *   return { ok: false as const, ...extractErrorInfo(err), itemGuid };
 */
export function extractErrorInfo(
  err: unknown,
): { error: string; status?: number; data?: unknown; code?: string } {
  // Axios marks its errors with isAxiosError === true. HTTP errors carry
  // `response`; network-level errors (DNS, refused, timeout) carry `code` only.
  // We type-narrow defensively rather than importing axios just for `isAxiosError`.
  const maybeAxios = err as {
    message?: string;
    isAxiosError?: boolean;
    response?: { status?: number; data?: unknown };
    code?: string;
  };
  if (maybeAxios?.isAxiosError) {
    if (maybeAxios.response) {
      return {
        error: maybeAxios.message ?? 'Request failed',
        status: maybeAxios.response.status,
        data: maybeAxios.response.data,
      };
    }
    return {
      error: maybeAxios.message ?? 'Network error',
      code: maybeAxios.code,
    };
  }
  if (err instanceof Error) return { error: err.message };
  if (typeof err === 'string') return { error: err };
  // Safety net: a circular value or BigInt would make JSON.stringify throw,
  // which would escape the caller's try/catch and turn isolation into a
  // whole-batch crash. JSON.stringify also *silently* returns undefined for
  // `undefined`, Symbol, and bare functions — yielding {error: undefined},
  // which serializes as {} (worse than useless; the caller can't tell the
  // helper ran at all). Fall back to String() which produces "undefined" /
  // "Symbol(...)" / "[object …]" — coarse but always a non-empty signal.
  try {
    const json = JSON.stringify(err);
    return { error: json ?? String(err) };
  } catch {
    return { error: Object.prototype.toString.call(err) };
  }
}
