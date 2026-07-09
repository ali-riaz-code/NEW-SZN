import 'dotenv/config'
import * as XLSX from 'xlsx'
import { PrismaClient, CallOutcome, ObjectionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const DEMO_BASE = 'demo/client data'

// ─── Date utilities ───────────────────────────────────────────────────────────

function excelToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000)
}

const DK_MONTHS: Record<string, number> = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, sep: 9, okt: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, june: 6, july: 7, august: 8, october: 10,
}

function parseDate(raw: string | number, year: number, month: number): Date | null {
  if (typeof raw === 'number') {
    if (raw > 10000) return excelToDate(raw)
    // day.month float e.g. 1.11, 16.11
    const str = raw.toFixed(2)
    const [d, m] = str.split('.').map(Number)
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return new Date(Date.UTC(year, m - 1, d))
    return null
  }
  const s = String(raw).trim().toLowerCase()
  // "2. juni" or "3.juni"
  const dk = s.match(/^(\d+)[\.\s]+([a-zæøå]+)/)
  if (dk) {
    const mon = DK_MONTHS[dk[2]]
    if (mon) return new Date(Date.UTC(year, mon - 1, Number(dk[1])))
  }
  // "21.11"
  const dot = s.match(/^(\d+)\.(\d+)$/)
  if (dot) {
    const [d, m] = [Number(dot[1]), Number(dot[2])]
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return new Date(Date.UTC(year, m - 1, d))
  }
  return null
}

// Infer year for a sheet given all sheet names (handles "Jan 26" suffix convention)
const MONTH_NAMES: Record<string, number> = {
  jan: 1, januar: 1, january: 1, feb: 2, februar: 2, february: 2,
  mar: 3, marts: 3, march: 3, apr: 4, april: 4, may: 5, maj: 5,
  jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, aug: 8, august: 8,
  sep: 9, september: 9, okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
}

function inferSheetMeta(allSheets: string[], sheet: string): { year: number; month: number } | null {
  const name = sheet.trim()
  // Explicit year: "Jan 26", "Feb 26"
  const m26 = name.match(/^([A-Za-z]+)\s+(\d{2})$/i)
  if (m26) {
    const mon = MONTH_NAMES[m26[1].toLowerCase()]
    if (mon) return { year: 2000 + Number(m26[2]), month: mon }
  }
  const mon = MONTH_NAMES[name.toLowerCase()]
  if (!mon) return null
  // Determine year by position relative to first "26" sheet
  const first26 = allSheets.findIndex(s => /\s+26$/i.test(s.trim()))
  const idx = allSheets.indexOf(sheet)
  const year = first26 >= 0 && idx > first26 ? 2026 : 2025
  return { year, month: mon }
}

// ─── Enum maps ────────────────────────────────────────────────────────────────

const OUTCOME_MAP: Record<string, CallOutcome> = {
  'full-pay': 'CLOSED_PIF',
  'full pay': 'CLOSED_PIF',
  "split-pay": 'CLOSED_SPLIT_PAY',
  'split pay': 'CLOSED_SPLIT_PAY',
  'deposit': 'CLOSED_DEPOSIT',
  'deposits': 'CLOSED_DEPOSIT',
  "offer & didn't buy": 'OFFER_DECLINED',
  "offer & didnt buy": 'OFFER_DECLINED',
  'bad fit & no offer': 'NOT_A_FIT',
  'no-show': 'NO_SHOW',
  'no show': 'NO_SHOW',
  'cancelled': 'CANCELLED',
  'rescheduled': 'RESCHEDULED',
  'drag over & show': 'DRAG_OVER_SHOW',
}

const OBJECTION_MAP: Record<string, ObjectionType> = {
  'think about it': 'THINK_ABOUT_IT',
  'money': 'MONEY',
  'time': 'TIME',
  'partner': 'PARTNER',
  'fear': 'FEAR',
  'value': 'VALUE',
}

function mapOutcome(s: string): CallOutcome | null {
  return OUTCOME_MAP[s.toLowerCase().trim()] ?? null
}
function mapObjection(s: string): ObjectionType | null {
  return OBJECTION_MAP[s.toLowerCase().trim()] ?? null
}
function minor(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : Math.round(n * 100)
}
function numVal(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

type Row = (string | number)[]

// ─── Closer tracker parser ────────────────────────────────────────────────────
// Two layouts: standard (Date at col 0) and Julie ($ at col 0, Date at col 1)

async function importCloserTracker(
  filePath: string,
  clientId: string,
  closerId: string,
  currency: string,
) {
  const wb = XLSX.readFile(filePath)
  let totalCalls = 0

  for (const sheetName of wb.SheetNames) {
    const meta = inferSheetMeta(wb.SheetNames, sheetName)
    if (!meta) continue // Dashboard, Template, Deposits, etc.

    const ws = wb.Sheets[sheetName]
    const allRows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: '' })
    const rows = allRows.filter(r => r.some(c => c !== ''))

    // Find the header row (contains "Date" or "Dato")
    const headerIdx = rows.findIndex(r =>
      String(r[0]).toLowerCase().includes('date') ||
      String(r[0]).toLowerCase().includes('dato') ||
      String(r[1]).toLowerCase().includes('date') // Julie layout
    )
    if (headerIdx < 0) continue

    const headerRow = rows[headerIdx]
    // Detect layout: Julie format has "$" at col 0
    const julieLayout = String(headerRow[0]).trim() === '$'
    const offset = julieLayout ? 1 : 0

    // col positions after offset: 0=Date,1=Name,3=Phone,4=Email,6=Source,7=Outcome,
    // 9=Revenue,10=Cash,12=Objection,13=ObjNotes,15=Length,16=Rec,17=FollowUp,18=Summary

    const dataRows = rows.slice(headerIdx + 1)

    const callsToCreate: Parameters<typeof prisma.call.createMany>[0]['data'] = []

    for (const row of dataRows) {
      const rawDate = row[offset + 0]
      const leadName = String(row[offset + 1] || '').trim().replace(/\n/g, ' ')
      const rawOutcome = String(row[offset + 7] || '').trim()

      if (!leadName || !rawOutcome) continue
      const outcome = mapOutcome(rawOutcome)
      if (!outcome) continue

      const date = parseDate(rawDate, meta.year, meta.month)
      if (!date) continue

      callsToCreate.push({
        date,
        clientId,
        closerId,
        leadName,
        leadPhone: String(row[offset + 3] || '').trim() || null,
        leadEmail: String(row[offset + 4] || '').trim() || null,
        leadSource: String(row[offset + 6] || '').trim() || null,
        outcome,
        revenueMinor: minor(row[offset + 9]),
        cashCollectedMinor: minor(row[offset + 10]),
        currency,
        objectionType: mapObjection(String(row[offset + 12] || '')),
        objectionNotes: String(row[offset + 13] || '').trim() || null,
        recordingUrl: String(row[offset + 16] || '').trim().startsWith('http')
          ? String(row[offset + 16]).trim()
          : null,
        followUpNotes: String(row[offset + 17] || '').trim() || null,
        callSummary: String(row[offset + 18] || '').trim() || null,
      })
    }

    if (callsToCreate.length > 0) {
      await prisma.call.createMany({ data: callsToCreate as any })
      totalCalls += callsToCreate.length
    }
  }

  return totalCalls
}

// ─── Setter tracker parser ────────────────────────────────────────────────────

async function importSetterTracker(
  filePath: string,
  clientId: string,
  setterId: string,
) {
  const wb = XLSX.readFile(filePath)
  let totalLogs = 0

  for (const sheetName of wb.SheetNames) {
    if (!['2025', '2026'].includes(sheetName)) continue
    const ws = wb.Sheets[sheetName]
    const allRows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: '' })
    const rows = allRows.filter(r => r.some(c => c !== ''))
    if (rows.length < 3) continue

    // Row index 1 has the date serials as column values
    const dateRow = rows[1]

    // Find metric rows by scanning col 0 labels
    const findRow = (keyword: string) =>
      rows.findIndex(r => String(r[0]).toLowerCase().replace(/[^a-z0-9]/g, '').includes(keyword))

    const newConvosIdx = findRow('newconv')
    const offersIdx = findRow('offers')
    const bookedIdx = rows.findIndex(r => {
      const l = String(r[0]).toLowerCase()
      return l.includes('booked call') || l === 'booked calls'
    })
    const followUpsIdx = rows.findIndex(r => {
      const l = String(r[0]).toLowerCase().replace(/\s/g, '')
      return l === 'follow-ups' || l === 'followups'
    })
    const fuOffersIdx = rows.findIndex(r => {
      const l = String(r[0]).toLowerCase().replace(/[\s-]/g, '')
      return l === 'followupoffers'
    })
    const fuBookedIdx = rows.findIndex(r => {
      const l = String(r[0]).toLowerCase().replace(/[\s-]/g, '')
      return l === 'followupbookedcalls'
    })
    const followerIdx = rows.findIndex(r => String(r[0]).toLowerCase().includes('follower count'))

    const getVal = (rowIdx: number, col: number): number => {
      if (rowIdx < 0) return 0
      const v = rows[rowIdx]?.[col]
      return typeof v === 'number' && isFinite(v) ? v : 0
    }

    for (let col = 1; col < dateRow.length; col++) {
      const rawDate = dateRow[col]
      // Skip monthly total columns (strings like "JAN", "FEB" or non-numeric)
      if (typeof rawDate !== 'number' || rawDate < 30000) continue

      const date = excelToDate(rawDate)

      const newConvos = getVal(newConvosIdx, col)
      const offers = getVal(offersIdx, col)
      const bookedCalls = getVal(bookedIdx, col)
      const followUps = getVal(followUpsIdx, col)
      const followUpOffers = getVal(fuOffersIdx, col)
      const followUpBookedCalls = getVal(fuBookedIdx, col)
      const followerRaw = followerIdx >= 0 ? rows[followerIdx]?.[col] : undefined
      const followerCount = typeof followerRaw === 'number' && followerRaw > 0 ? followerRaw : null

      if (newConvos === 0 && offers === 0 && bookedCalls === 0 && followUps === 0) continue

      await prisma.setterLog.upsert({
        where: { setterId_clientId_date: { setterId, clientId, date } },
        update: { newConvos, offers, bookedCalls, followUps, followUpOffers, followUpBookedCalls, followerCount },
        create: { date, clientId, setterId, newConvos, offers, bookedCalls, followUps, followUpOffers, followUpBookedCalls, followerCount },
      })
      totalLogs++
    }
  }
  return totalLogs
}

// ─── Ads daily metric parser ──────────────────────────────────────────────────
// Col layout (Daniel / Matti / Hope): Day, AD Follows, New AD Follows, Total Spend, Daily Spend, Cost/Lead, Calls Booked, Cash Collected, Revenue, Cost per Call
// Lennart layout (no Total Spend col):  Day, AD Follows, New AD Follows, Daily Spend, Cost/Lead, Calls Booked, Cash Collected, Revenue, Cost per Call

async function importAdsTracker(
  filePath: string,
  clientId: string,
  currency: string,
) {
  const wb = XLSX.readFile(filePath)
  let totalRows = 0

  const DATA_SHEETS = new Set([
    'januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august',
    'september', 'oktober', 'november', 'december',
    'january', 'february', 'march', 'june', 'july', 'august', 'october',
  ])

  for (const sheetName of wb.SheetNames) {
    if (!DATA_SHEETS.has(sheetName.toLowerCase())) continue

    const ws = wb.Sheets[sheetName]
    const allRows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: '' })
    const rows = allRows.filter(r => r.some(c => c !== ''))
    if (rows.length < 2) continue

    const header = rows[0].map(h => String(h).toLowerCase().trim())
    // Detect if "Total Spend" column exists (index 3)
    const hasTotalSpend = header[3]?.includes('total')
    const spendOffset = hasTotalSpend ? 1 : 0

    // After optional Total Spend: Daily Spend, Cost/Lead, Calls Booked, Cash Collected, Revenue
    // col 0: Day, col 1: AD Follows, col 2: New AD Follows
    // col 3+spendOffset: Daily Spend, col 4+spendOffset: Cost/Lead
    // col 5+spendOffset: Calls Booked, col 6+spendOffset: Cash Collected
    // col 7+spendOffset: Revenue

    const toCreate: Parameters<typeof prisma.adDailyMetric.createMany>[0]['data'] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const rawDate = row[0]
      if (typeof rawDate !== 'number' || rawDate < 30000) continue

      const date = excelToDate(rawDate)

      const totalSpendMinor = hasTotalSpend ? minor(row[3]) : 0
      const dailySpendMinor = minor(row[3 + spendOffset])
      const costPerLeadMinor = minor(row[4 + spendOffset])
      const callsBooked = numVal(row[5 + spendOffset])
      const cashCollectedMinor = minor(row[6 + spendOffset])
      const revenueMinor = minor(row[7 + spendOffset])
      const newAdFollows = numVal(row[2])

      if (dailySpendMinor === 0 && newAdFollows === 0) continue

      toCreate.push({
        date,
        clientId,
        currency,
        newAdFollows: Math.round(newAdFollows),
        dailySpendMinor,
        totalSpendMinor,
        costPerLeadMinor: costPerLeadMinor || null,
        callsBooked: Math.round(callsBooked),
        revenueMinor,
        cashCollectedMinor,
      })
    }

    if (toCreate.length > 0) {
      // upsert one by one because of @@unique([clientId, date])
      for (const d of toCreate) {
        await prisma.adDailyMetric.upsert({
          where: { clientId_date: { clientId: d.clientId, date: d.date } },
          update: d,
          create: d,
        })
        totalRows++
      }
    }
  }
  return totalRows
}

// ─── P&L parser ───────────────────────────────────────────────────────────────

async function importPnL(filePath: string, clientId: string, currency: string) {
  const wb = XLSX.readFile(filePath)
  let total = 0

  for (const sheetName of wb.SheetNames) {
    const yearMatch = sheetName.match(/(\d{4})/)
    if (!yearMatch) continue
    const year = Number(yearMatch[1])

    const ws = wb.Sheets[sheetName]
    const allRows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: '' })
    const rows = allRows.filter(r => r.some(c => c !== ''))
    if (rows.length < 2) continue

    // Row 0 is headers: [Category, Total, month1, month2, ...]
    // Parse month headers from formatted cell values
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const months: number[] = []
    for (let c = 2; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      const cell = ws[addr]
      if (!cell) break
      // Formatted value like "January 25", "February 25"
      const w = String(cell.w || '').trim()
      const wMatch = w.match(/([A-Za-z]+)\s+(\d+)/)
      if (wMatch) {
        const mon = MONTH_NAMES[wMatch[1].toLowerCase()]
        if (mon) { months.push(mon); continue }
      }
      break
    }

    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri]
      const category = String(row[0] || '').trim()
      if (!category || category === 'Income' || category === 'Expenses' ||
          category === '' || category.startsWith('Total') && row[1] === '') continue

      for (let mi = 0; mi < months.length; mi++) {
        const month = months[mi]
        const val = row[2 + mi]
        if (typeof val !== 'number' || val === 0) continue

        await prisma.pnLEntry.upsert({
          where: { clientId_year_month_categoryName: { clientId, year, month, categoryName: category } },
          update: { amountMinor: minor(val) },
          create: { clientId, year, month, categoryName: category, amountMinor: minor(val), currency },
        })
        total++
      }
    }
  }
  return total
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding demo data from Excel trackers...\n')

  // ── 0. Remove stale demo-account memberships (idempotent cleanup) ────────────
  const demoEmails = ['admin@newsznagency.com', 'demo@newsznagency.com', 'setter@newsznagency.com', 'client@newsznagency.com']
  const existingDemoUsers = await prisma.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true } })
  if (existingDemoUsers.length > 0) {
    await prisma.membership.deleteMany({ where: { userId: { in: existingDemoUsers.map(u => u.id) } } })
  }

  // ── 1. Clients ───────────────────────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: 'demo-agency-client-id' },
      update: {},
      create: { id: 'demo-agency-client-id', name: 'Demo Agency', currency: 'USD', timezone: 'America/New_York' },
    }),
    prisma.client.upsert({
      where: { id: 'client-daniel' },
      update: {},
      create: { id: 'client-daniel', name: 'Daniel Steffensen', currency: 'DKK', timezone: 'Europe/Copenhagen' },
    }),
    prisma.client.upsert({
      where: { id: 'client-julie' },
      update: {},
      create: { id: 'client-julie', name: 'Julie Bundgaard', currency: 'DKK', timezone: 'Europe/Copenhagen' },
    }),
    prisma.client.upsert({
      where: { id: 'client-lennart' },
      update: {},
      create: { id: 'client-lennart', name: 'Lennart', currency: 'EUR', timezone: 'Europe/Berlin' },
    }),
    prisma.client.upsert({
      where: { id: 'client-matti' },
      update: {},
      create: { id: 'client-matti', name: 'Matti Isho', currency: 'DKK', timezone: 'Europe/Copenhagen' },
    }),
    prisma.client.upsert({
      where: { id: 'client-hope' },
      update: {},
      create: { id: 'client-hope', name: 'Thee Bridal Coach', currency: 'USD', timezone: 'America/New_York' },
    }),
    // Archive (inactive)
    prisma.client.upsert({
      where: { id: 'client-lucas' },
      update: {},
      create: { id: 'client-lucas', name: 'Lucas Hedenbeck', currency: 'DKK', timezone: 'Europe/Copenhagen', isActive: false },
    }),
    prisma.client.upsert({
      where: { id: 'client-anders' },
      update: {},
      create: { id: 'client-anders', name: 'Anders Hansen', currency: 'DKK', timezone: 'Europe/Copenhagen', isActive: false },
    }),
    prisma.client.upsert({
      where: { id: 'client-olivia' },
      update: {},
      create: { id: 'client-olivia', name: 'Olivia Bischoff', currency: 'DKK', timezone: 'Europe/Copenhagen', isActive: false },
    }),
    prisma.client.upsert({
      where: { id: 'client-mads' },
      update: {},
      create: { id: 'client-mads', name: 'The Property Business (Mads)', currency: 'DKK', timezone: 'Europe/Copenhagen', isActive: false },
    }),
  ])
  console.log(`✓ ${clients.length} clients`)

  // ── 1b. FX rates ─────────────────────────────────────────────────────────────
  // Clients bill in their own currency (DKK/EUR/USD) but the agency-wide Master
  // dashboard displays everything in USD. That conversion reads the FxRate cache;
  // in production a daily cron calls fetchAndCacheFxRates(). For the demo we seed a
  // reasonable static snapshot so aggregate revenue/cash/spend convert correctly
  // offline. Base = USD; rate is "units of the currency per 1 USD".
  const fxDate = new Date().toISOString().substring(0, 10) // YYYY-MM-DD
  const staticRates: Record<string, number> = { USD: 1, DKK: 6.9, EUR: 0.92 }
  await Promise.all(
    Object.entries(staticRates).map(([toCurrency, rate]) =>
      prisma.fxRate.upsert({
        where: { fromCurrency_toCurrency_date: { fromCurrency: 'USD', toCurrency, date: fxDate } },
        update: { rate },
        create: { fromCurrency: 'USD', toCurrency, date: fxDate, rate },
      }),
    ),
  )
  console.log(`✓ ${Object.keys(staticRates).length} FX rates (USD base, ${fxDate})`)

  // ── 2. Users ─────────────────────────────────────────────────────────────────
  const PASS = 'Demo@demo123'
  const hash = await bcrypt.hash(PASS, 10)

  type UserDef = { id: string; email: string; name: string; role: 'ADMIN' | 'CLOSER' | 'SETTER' | 'CLIENT'; memberOf: string[] }
  const userDefs: UserDef[] = [
    // Demo login accounts — membered to client-daniel so they see real data by default
    { id: 'user-admin',  email: 'admin@newsznagency.com',  name: 'Demo Admin',  role: 'ADMIN',  memberOf: ['client-daniel'] },
    { id: 'user-demo',   email: 'demo@newsznagency.com',   name: 'Demo Closer', role: 'CLOSER', memberOf: ['client-daniel'] },
    { id: 'user-setter', email: 'setter@newsznagency.com', name: 'Demo Setter', role: 'SETTER', memberOf: ['client-daniel'] },
    { id: 'user-client', email: 'client@newsznagency.com', name: 'Demo Client', role: 'CLIENT', memberOf: ['client-daniel'] },
    // Real closers
    { id: 'closer-anna',    email: 'anna@newsznagency.com',           name: 'Anna',   role: 'CLOSER', memberOf: ['client-daniel', 'client-hope'] },
    { id: 'closer-nichlas', email: 'nichlas@newsznagency.com',        name: 'Nichlas', role: 'CLOSER', memberOf: ['client-daniel', 'client-matti'] },
    { id: 'closer-julie',   email: 'julie.closer@newsznagency.com',   name: 'Julie',   role: 'CLOSER', memberOf: ['client-julie'] },
    { id: 'closer-lennart', email: 'lennart.closer@newsznagency.com', name: 'Lennart', role: 'CLOSER', memberOf: ['client-lennart'] },
    { id: 'closer-matti',   email: 'matti.closer@newsznagency.com',   name: 'Matti',   role: 'CLOSER', memberOf: ['client-matti'] },
    { id: 'closer-emir',    email: 'emir@newsznagency.com',           name: 'Emir',    role: 'CLOSER', memberOf: ['client-matti'] },
    { id: 'closer-soren',   email: 'soren@newsznagency.com',          name: 'Søren',   role: 'CLOSER', memberOf: ['client-matti'] },
    { id: 'closer-biljana', email: 'biljana@newsznagency.com',        name: 'Biljana', role: 'CLOSER', memberOf: ['client-hope'] },
    // Real setters
    { id: 'setter-mathias',  email: 'mathias@newsznagency.com',  name: 'Mathias',  role: 'SETTER', memberOf: ['client-daniel', 'client-hope'] },
    { id: 'setter-karoline', email: 'karoline@newsznagency.com', name: 'Karoline', role: 'SETTER', memberOf: ['client-julie'] },
    { id: 'setter-mikkel',   email: 'mikkel@newsznagency.com',   name: 'Mikkel',   role: 'SETTER', memberOf: ['client-matti'] },
    { id: 'setter-carl',     email: 'carl@newsznagency.com',     name: 'Carl',     role: 'SETTER', memberOf: ['client-hope'] },
  ]

  const userIdMap: Record<string, string> = {}
  for (const u of userDefs) {
    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash: hash, role: u.role, isActive: true },
      create: { id: u.id, email: u.email, name: u.name, passwordHash: hash, role: u.role },
    })
    for (const clientId of u.memberOf) {
      await prisma.membership.upsert({
        where: { userId_clientId: { userId: dbUser.id, clientId } },
        update: {},
        create: { userId: dbUser.id, clientId },
      })
    }
    // Keep a runtime map of logical id → db id for closer/setter imports
    userIdMap[u.id] = dbUser.id
  }
  console.log(`✓ ${userDefs.length} users`)

  // ── 3. Clear existing call data for real clients ──────────────────────────────
  const realClientIds = ['client-daniel', 'client-julie', 'client-lennart', 'client-matti', 'client-hope']
  await prisma.leadTag.deleteMany({ where: { call: { clientId: { in: realClientIds } } } })
  await prisma.call.deleteMany({ where: { clientId: { in: realClientIds } } })
  console.log('  Cleared existing calls')

  // ── 4. Import closer tracker data ─────────────────────────────────────────────
  console.log('\nImporting closer trackers...')

  const closerJobs: { file: string; clientId: string; closerId: string; currency: string }[] = [
    { file: `${DEMO_BASE}/Daniel Steffensen/Closer tracker/Anna DS Closer tracker.xlsx`,    clientId: 'client-daniel', closerId: userIdMap['closer-anna'],    currency: 'DKK' },
    { file: `${DEMO_BASE}/Daniel Steffensen/Closer tracker/Nichlas closer tracker.xlsx`,    clientId: 'client-daniel', closerId: userIdMap['closer-nichlas'], currency: 'DKK' },
    { file: `${DEMO_BASE}/Julie Bundgaard/Closer tracker/Julie Tracker.xlsx`,               clientId: 'client-julie',  closerId: userIdMap['closer-julie'],   currency: 'DKK' },
    { file: `${DEMO_BASE}/Lennart/Lennart sales tracker.xlsx`,                              clientId: 'client-lennart', closerId: userIdMap['closer-lennart'], currency: 'EUR' },
    { file: `${DEMO_BASE}/Matti Isho/Closer trackers/Emir Tracker - Matti.xlsx`,            clientId: 'client-matti',  closerId: userIdMap['closer-emir'],    currency: 'DKK' },
    { file: `${DEMO_BASE}/Matti Isho/Closer trackers/Matti Isho Closer Tracker.xlsx`,       clientId: 'client-matti',  closerId: userIdMap['closer-matti'],   currency: 'DKK' },
    { file: `${DEMO_BASE}/Matti Isho/Closer trackers/Nichlas closer tracker Matti.xlsx`,    clientId: 'client-matti',  closerId: userIdMap['closer-nichlas'], currency: 'DKK' },
    { file: `${DEMO_BASE}/Matti Isho/Closer trackers/Søren - Matti tracker.xlsx`,           clientId: 'client-matti',  closerId: userIdMap['closer-soren'],   currency: 'DKK' },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/Closer tracker/Anna - Hope tracker.xlsx`, clientId: 'client-hope',  closerId: userIdMap['closer-anna'],    currency: 'USD' },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/Closer tracker/Biljana - Hope tracker.xlsx`, clientId: 'client-hope', closerId: userIdMap['closer-biljana'], currency: 'USD' },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/Closer tracker/Sales tracker_CRM - Hope.xlsx`, clientId: 'client-hope', closerId: userIdMap['closer-anna'], currency: 'USD' },
  ]

  let totalCalls = 0
  for (const job of closerJobs) {
    try {
      const n = await importCloserTracker(job.file, job.clientId, job.closerId, job.currency)
      console.log(`  ${job.file.split('/').pop()}: ${n} calls`)
      totalCalls += n
    } catch (e: any) {
      console.warn(`  ⚠ Skipped ${job.file.split('/').pop()}: ${e.message}`)
    }
  }
  console.log(`✓ ${totalCalls} calls total`)

  // ── 5. Import setter tracker data ─────────────────────────────────────────────
  console.log('\nImporting setter trackers...')
  const setterJobs: { file: string; clientId: string; setterId: string }[] = [
    { file: `${DEMO_BASE}/Daniel Steffensen/Setter tracker/Mathias tracker.xlsx`, clientId: 'client-daniel', setterId: userIdMap['setter-mathias'] },
    { file: `${DEMO_BASE}/Julie Bundgaard/Setter tracker/Karoline setter tracker.xlsx`, clientId: 'client-julie', setterId: userIdMap['setter-karoline'] },
    { file: `${DEMO_BASE}/Matti Isho/Setter trackers/Mikkel Tracker.xlsx`, clientId: 'client-matti', setterId: userIdMap['setter-mikkel'] },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/Setter tracker/Carl- Hope tracker.xlsx`, clientId: 'client-hope', setterId: userIdMap['setter-carl'] },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/Setter tracker/Mathias - Hope tracker.xlsx`, clientId: 'client-hope', setterId: userIdMap['setter-mathias'] },
  ]

  let totalLogs = 0
  for (const job of setterJobs) {
    try {
      const n = await importSetterTracker(job.file, job.clientId, job.setterId)
      console.log(`  ${job.file.split('/').pop()}: ${n} logs`)
      totalLogs += n
    } catch (e: any) {
      console.warn(`  ⚠ Skipped ${job.file.split('/').pop()}: ${e.message}`)
    }
  }
  console.log(`✓ ${totalLogs} setter logs total`)

  // ── 6. Import ads daily metrics ───────────────────────────────────────────────
  console.log('\nImporting ads trackers...')
  const adsJobs: { file: string; clientId: string; currency: string }[] = [
    { file: `${DEMO_BASE}/Daniel Steffensen/Ads tracker/Daniel 2026 TRACKER.xlsx`, clientId: 'client-daniel', currency: 'DKK' },
    { file: `${DEMO_BASE}/Julie Bundgaard/Ads Tracker/Julie - Follower Ads Tracker.xlsx`, clientId: 'client-julie', currency: 'DKK' },
    { file: `${DEMO_BASE}/Lennart/Lennart - Follower Ads Tracker.xlsx`, clientId: 'client-lennart', currency: 'EUR' },
    { file: `${DEMO_BASE}/Matti Isho/Ads Tracker/Matti 2026 TRACKER.xlsx`, clientId: 'client-matti', currency: 'DKK' },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/Ads tracker/Hope 2026 TRACKER.xlsx`, clientId: 'client-hope', currency: 'USD' },
  ]

  let totalAdRows = 0
  for (const job of adsJobs) {
    try {
      const n = await importAdsTracker(job.file, job.clientId, job.currency)
      console.log(`  ${job.file.split('/').pop()}: ${n} rows`)
      totalAdRows += n
    } catch (e: any) {
      console.warn(`  ⚠ Skipped ${job.file.split('/').pop()}: ${e.message}`)
    }
  }
  console.log(`✓ ${totalAdRows} ad daily metric rows total`)

  // ── 7. Import P&L data ────────────────────────────────────────────────────────
  console.log('\nImporting P&L files...')
  const pnlJobs: { file: string; clientId: string; currency: string }[] = [
    { file: `${DEMO_BASE}/Daniel Steffensen/P&L/Daniel steffensen P&L.xlsx`, clientId: 'client-daniel', currency: 'DKK' },
    { file: `${DEMO_BASE}/Matti Isho/P&L/Matti P&L AUTO.xlsx`, clientId: 'client-matti', currency: 'DKK' },
    { file: `${DEMO_BASE}/Thee Bridal Coach (Hope)/P&L/p&l Hope.xlsx`, clientId: 'client-hope', currency: 'USD' },
  ]

  let totalPnL = 0
  for (const job of pnlJobs) {
    try {
      const n = await importPnL(job.file, job.clientId, job.currency)
      console.log(`  ${job.file.split('/').pop()}: ${n} entries`)
      totalPnL += n
    } catch (e: any) {
      console.warn(`  ⚠ Skipped ${job.file.split('/').pop()}: ${e.message}`)
    }
  }
  console.log(`✓ ${totalPnL} P&L entries total`)

  console.log('\n✅ Seed complete.')
  console.log('\nDemo login credentials (all passwords: Demo@demo123):')
  console.log('  ADMIN:  admin@newsznagency.com')
  console.log('  CLOSER: demo@newsznagency.com')
  console.log('  SETTER: setter@newsznagency.com')
  console.log('  CLIENT: client@newsznagency.com')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
