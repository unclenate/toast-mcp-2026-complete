import { z } from 'zod';

/**
 * Monetary input bounds (ADR-0003).
 *
 * Tool input fields representing money use `positiveCents()` (or the
 * bipolar `boundedMagnitudeCents()` for the single bipolar cash-entry
 * amount). The shared bound `MAX_MONETARY_CENTS` defaults to 10_000_000
 * cents (= $100,000) and is env-overridable via `TOAST_MAX_MONETARY_CENTS`
 * so operators with legitimate high-value scenarios (e.g., a large cash
 * deposit during a reconciliation event) can raise the cap without a
 * code change.
 *
 * Mitigates RISK-001 (`refundAmount`), RISK-002 (cash entry + cash
 * deposit `amount`), and RISK-010 (four additional unbounded fields
 * surfaced during M3 inventory).
 */

const DEFAULT_MAX_MONETARY_CENTS = 10_000_000;

/**
 * Strict parse of TOAST_MAX_MONETARY_CENTS. Mirrors `parseReadOnly` from
 * ADR-0002: unknown shapes warn and default rather than silently
 * accepting a typo that could weaken the bound.
 *
 * Accepted: unset, empty, or a plain positive-integer decimal string
 * (`/^[1-9]\d*$/`) within Number.MAX_SAFE_INTEGER.
 * Rejected (warn + default): negative, zero, leading zeros, decimals,
 * non-numeric, AND deliberately permissive `Number()` shapes that would
 * silently weaken the bound — scientific notation (`"1e10"`), hex
 * (`"0x10"`), whitespace (`" 42 "`), and values past 2^53 where
 * `Number()` loses integer precision.
 *
 * The signature is `string | undefined` because the only production
 * caller is `process.env.TOAST_MAX_MONETARY_CENTS`. The runtime guard
 * below also handles a non-string slipping in from a JS caller.
 */
export function parseMaxMonetaryCents(
  raw: string | undefined,
): { value: number; warning: string | null } {
  if (raw === undefined || raw === '') {
    return { value: DEFAULT_MAX_MONETARY_CENTS, warning: null };
  }
  const reject = {
    value: DEFAULT_MAX_MONETARY_CENTS,
    warning: `[Toast MCP] TOAST_MAX_MONETARY_CENTS=${JSON.stringify(raw)} is not a plain positive integer within safe range (e.g. "5000000"); defaulting to ${DEFAULT_MAX_MONETARY_CENTS}`,
  };
  // Reject non-strings (JS callers) and anything that isn't a bare
  // positive-integer decimal: no sign, no decimal point, no exponent,
  // no hex, no whitespace, no leading zero.
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) {
    return reject;
  }
  const parsed = Number(raw);
  // The regex already guarantees a positive integer; this catches the
  // >2^53 case where Number() silently loses precision.
  if (!Number.isSafeInteger(parsed)) {
    return reject;
  }
  return { value: parsed, warning: null };
}

const parsed = parseMaxMonetaryCents(process.env.TOAST_MAX_MONETARY_CENTS);
if (parsed.warning) console.error(parsed.warning);

/**
 * Resolved monetary upper bound in cents. Captured ONCE at module load
 * from `TOAST_MAX_MONETARY_CENTS`; the factory schemas below close over
 * this value. Tests that need a different bound must set the env var
 * before any import path transitively pulls this module (importing a
 * tool module is enough to trigger the capture).
 */
export const MAX_MONETARY_CENTS = parsed.value;

/**
 * Schema for a strictly-positive monetary field: integer cents, > 0,
 * ≤ MAX_MONETARY_CENTS. Use `.describe(...)` at the call site to attach
 * the per-field documentation that the MCP wire protocol surfaces.
 */
export function positiveCents() {
  return z.number().int().positive().max(MAX_MONETARY_CENTS);
}

/**
 * Schema for the single bipolar monetary field — `amount` on
 * `toast_create_cash_entry`, where the adjacent `type: 'PAID_IN' | 'PAID_OUT'`
 * enum carries the sign and the upstream schema description allows
 * negative for PAID_OUT. Bounded magnitude with integer, nonzero.
 */
export function boundedMagnitudeCents() {
  return z
    .number()
    .int()
    .refine((n) => n !== 0 && Math.abs(n) <= MAX_MONETARY_CENTS, {
      // `.int()` rejects decimals before this runs, so this message only
      // surfaces for zero or out-of-magnitude values.
      message: `magnitude must be nonzero with |amount| ≤ ${MAX_MONETARY_CENTS} cents`,
    });
}
