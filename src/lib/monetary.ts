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
 * Accepted: unset, empty, or a parseable positive integer.
 * Rejected (warn + default): negative, zero, decimal, non-numeric.
 */
export function parseMaxMonetaryCents(
  raw: string | undefined,
): { value: number; warning: string | null } {
  if (raw === undefined || raw === '') {
    return { value: DEFAULT_MAX_MONETARY_CENTS, warning: null };
  }
  // Number() returns NaN on non-numeric; reject decimals and non-positive.
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0) {
    return { value: parsed, warning: null };
  }
  return {
    value: DEFAULT_MAX_MONETARY_CENTS,
    warning: `[Toast MCP] TOAST_MAX_MONETARY_CENTS=${JSON.stringify(raw)} is not a positive integer; defaulting to ${DEFAULT_MAX_MONETARY_CENTS}`,
  };
}

const parsed = parseMaxMonetaryCents(process.env.TOAST_MAX_MONETARY_CENTS);
if (parsed.warning) console.error(parsed.warning);

/** Resolved monetary upper bound in cents. Frozen at module load. */
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
      message: `magnitude must be a nonzero integer with |amount| ≤ ${MAX_MONETARY_CENTS} cents`,
    });
}
