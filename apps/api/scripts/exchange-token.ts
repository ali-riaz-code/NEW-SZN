// Exchange a short-lived Meta token for a long-lived (~60 day) one.
//
// Usage (from apps/api):
//   npx tsx scripts/exchange-token.ts <FRESH_SHORT_TOKEN>
//
// Reads META_APP_ID / META_APP_SECRET from the monorepo-root .env, calls Meta's
// fb_exchange_token endpoint, prints the long-lived token, and reports its expiry.

import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0'

async function main() {
  const shortToken = process.argv[2]
  if (!shortToken) {
    console.error('ERROR: pass a fresh short-lived token as the first argument.')
    console.error('Usage: npx tsx scripts/exchange-token.ts <FRESH_SHORT_TOKEN>')
    process.exit(1)
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    console.error('ERROR: META_APP_ID and META_APP_SECRET must be set in .env.')
    process.exit(1)
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', shortToken)

  const res = await fetch(url.toString())
  const body = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: { message?: string }
  }

  if (!res.ok || !body.access_token) {
    console.error(`Exchange failed (${res.status}):`, body.error?.message ?? JSON.stringify(body))
    process.exit(1)
  }

  const days = body.expires_in ? Math.round(body.expires_in / 86400) : '≈60'
  console.log('\n─────────────────────────────────────────────')
  console.log('LONG-LIVED TOKEN (valid ~' + days + ' days):\n')
  console.log(body.access_token)
  console.log('\nPaste this into .env as:')
  console.log('META_SYSTEM_USER_TOKEN=' + body.access_token)
  console.log('─────────────────────────────────────────────\n')
}

main()
