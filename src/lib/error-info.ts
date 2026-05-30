/**
 * Extract a useful error summary from a caught value of unknown shape.
 *
 * Tool handlers that batch operations (e.g., `toast_bulk_update_stock`) need to
 * surface per-item failures to the MCP caller without crashing the whole call.
 * The previous pattern (`err?.message ?? String(err)`) loses Axios's HTTP
 * status and response body — meaningful signal for distinguishing "401 across
 * the board" (auth misconfig) from "one 404" (deleted item).
 *
 * Returned shape is flat so callers can spread it into their result objects:
 *   return { ok: false as const, ...extractErrorInfo(err), itemGuid };
 */
export function extractErrorInfo(err: unknown): { error: string; status?: number; data?: unknown } {
  // Axios marks its errors with isAxiosError === true and attaches `response`.
  // We type-narrow defensively rather than importing axios just for `isAxiosError`.
  const maybeAxios = err as {
    message?: string;
    isAxiosError?: boolean;
    response?: { status?: number; data?: unknown };
  };
  if (maybeAxios?.isAxiosError && maybeAxios.response) {
    return {
      error: maybeAxios.message ?? 'Request failed',
      status: maybeAxios.response.status,
      data: maybeAxios.response.data,
    };
  }
  if (err instanceof Error) return { error: err.message };
  if (typeof err === 'string') return { error: err };
  return { error: JSON.stringify(err) };
}
