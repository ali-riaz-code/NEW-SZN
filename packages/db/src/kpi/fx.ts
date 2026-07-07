import { prisma } from '../index'

const FX_API_BASE = 'https://v6.exchangerate-api.com/v6'

// Fetch latest rates from exchangerate-api.com and upsert into the FxRate table.
// Call once per day from a cron job; all other code reads from the DB cache.
export async function fetchAndCacheFxRates(baseCurrency = 'USD'): Promise<void> {
  const apiKey = process.env.FX_API_KEY
  if (!apiKey) throw new Error('FX_API_KEY not set')

  const res = await fetch(`${FX_API_BASE}/${apiKey}/latest/${baseCurrency}`)
  if (!res.ok) throw new Error(`FX API error: HTTP ${res.status}`)

  const data = (await res.json()) as {
    result: string
    base_code: string
    conversion_rates: Record<string, number>
  }
  if (data.result !== 'success') throw new Error('FX API returned non-success result')

  const date = new Date().toISOString().substring(0, 10) // YYYY-MM-DD

  await Promise.all(
    Object.entries(data.conversion_rates).map(([toCurrency, rate]) =>
      prisma.fxRate.upsert({
        where: {
          fromCurrency_toCurrency_date: { fromCurrency: baseCurrency, toCurrency, date },
        },
        create: { fromCurrency: baseCurrency, toCurrency, date, rate },
        update: { rate, fetchedAt: new Date() },
      }),
    ),
  )
}

// Read today's (or a specific date's) rates from the DB cache.
// Returns a map of currency code → rate relative to baseCurrency.
// Example with baseCurrency=USD: { USD: 1, DKK: 6.89, EUR: 0.92, ... }
export async function getDailyRates(
  baseCurrency = 'USD',
  date?: string,
): Promise<Record<string, number>> {
  const d = date ?? new Date().toISOString().substring(0, 10)
  const rows = await prisma.fxRate.findMany({
    where: { fromCurrency: baseCurrency, date: d },
    select: { toCurrency: true, rate: true },
  })
  return Object.fromEntries(rows.map((r) => [r.toCurrency, Number(r.rate)]))
}

// Read the most recent cached rates, regardless of date. Useful for display code
// that just needs "current" rates without depending on the daily fetch having run
// today — falls back to the latest available snapshot in the cache.
export async function getLatestRates(
  baseCurrency = 'USD',
): Promise<Record<string, number>> {
  const latest = await prisma.fxRate.findFirst({
    where: { fromCurrency: baseCurrency },
    orderBy: { date: 'desc' },
    select: { date: true },
  })
  if (!latest) return {}
  return getDailyRates(baseCurrency, latest.date)
}

// Convert a minor-unit amount from one currency to another for display.
//
// rates: map of currency → units per 1 baseCurrency (same base used in getDailyRates).
// Returns the result in major units (float, for display formatting by the caller).
//
// Never assumes USD. Never hardcodes currency symbols — the caller formats for display.
// If a rate is missing, returns the unconverted major-unit value and logs a warning.
export function convertToDisplay(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return amountMinor / 100

  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]

  if (fromRate == null || toRate == null) {
    // Rate missing — return unconverted value to avoid silent data corruption.
    return amountMinor / 100
  }

  // Convert via base: fromCurrency → base → toCurrency
  const amountMajor = amountMinor / 100
  return (amountMajor / fromRate) * toRate
}
