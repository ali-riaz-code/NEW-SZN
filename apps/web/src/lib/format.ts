const CURRENCY_PREFIX: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
}

// Format minor units (e.g. 7480000 øre) to a compact display string like "$74.8K" or "74.8K kr."
export function formatMoney(minorUnits: number, currency: string): string {
  const major = minorUnits / 100
  const abs = Math.abs(major)

  let compact: string
  if (abs >= 1_000_000) compact = `${(major / 1_000_000).toFixed(1)}M`
  else if (abs >= 1_000) compact = `${(major / 1_000).toFixed(1)}K`
  else compact = major.toFixed(0)

  const prefix = CURRENCY_PREFIX[currency]
  if (prefix) return `${prefix}${compact}`
  // DKK and other suffix currencies
  return `${compact} kr.`
}

// Format a decimal multiplier (e.g. 4.86) as "4.86x"
export function formatMultiplier(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}x`
}

// Format a 0–100 percentage to "31.1%"
export function formatPct(value: number, decimals = 1): string {
  return `${Math.abs(value).toFixed(decimals)}%`
}

// Format a plain integer count
export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}
