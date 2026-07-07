// Shared types used by both web and api. Keep framework-agnostic.

// Matches the Prisma Role enum (uppercase).
export const ROLES = ['ADMIN', 'CLOSER', 'SETTER', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
  email: string;
}

/**
 * Currency is stored per amount — never assume USD. Conversion uses live
 * FX rates (see docs/... and the FX_API_KEY integration).
 */
export type CurrencyCode = string; // ISO 4217, e.g. "USD", "GBP", "EUR"

export interface Money {
  /** Integer minor units (e.g. cents) to avoid floating-point drift. */
  amountMinor: number;
  currency: CurrencyCode;
}
