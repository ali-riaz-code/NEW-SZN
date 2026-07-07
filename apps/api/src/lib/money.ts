// Server-side money formatting for Slack messages, AI prompts, and PDF reports.
// Mirrors apps/web/src/lib/format.ts. Never assume USD — currency is always passed.

const CURRENCY_PREFIX: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
}

// Full (non-compact) money string, e.g. "$74,800.00" or "74.800,00 kr."
export function formatMoney(minorUnits: number, currency: string): string {
  const major = minorUnits / 100
  const prefix = CURRENCY_PREFIX[currency]
  if (prefix) {
    return `${prefix}${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  // DKK and other suffix currencies
  return `${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.`
}

// Compact money string for tight spaces, e.g. "$74.8K" or "74.8K kr."
export function formatMoneyCompact(minorUnits: number, currency: string): string {
  const major = minorUnits / 100
  const abs = Math.abs(major)
  let compact: string
  if (abs >= 1_000_000) compact = `${(major / 1_000_000).toFixed(1)}M`
  else if (abs >= 1_000) compact = `${(major / 1_000).toFixed(1)}K`
  else compact = major.toFixed(0)
  const prefix = CURRENCY_PREFIX[currency]
  return prefix ? `${prefix}${compact}` : `${compact} kr.`
}
