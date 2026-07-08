export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Proxies the authed PDF download from the Express API to the browser. The
// browser can't send the internal service headers, so this same-origin route
// verifies the session and streams the file through. Admins can download any
// report; clients only their own — the Express API enforces that ownership
// check (returns 404 for reports outside the client's membership).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'CLIENT') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const res = await fetch(`${API_BASE}/api/reports/${params.id}/download`, {
    headers: {
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET ?? '',
      'X-User-Id': session.user.userId,
      'X-User-Role': session.user.role,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    return new NextResponse('Report unavailable', { status: res.status })
  }

  const body = await res.arrayBuffer()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment; filename="report.pdf"',
    },
  })
}
