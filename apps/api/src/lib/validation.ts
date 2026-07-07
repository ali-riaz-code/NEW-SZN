import { z } from 'zod'

// Shared entity-id validator for request input.
//
// Why not `z.string().cuid()`: production rows created by Prisma get cuid ids
// (e.g. "cmr2d46s3000013fx4gx44o5f"), but the one-time Excel importer assigns
// human-readable slug ids so entities can be cross-referenced during import
// (e.g. "client-matti", "closer-anna", "demo-agency-client-id"). Both id shapes
// are live in the real database. `.cuid()` rejected the slug shape, so any
// endpoint receiving an explicit clientId/closerId/userId for a seed-origin row
// returned 400 — which is exactly the path Settings (explicit client selection)
// exercises. This validator accepts both shapes while still bounding the input
// (non-empty, max length, safe character set) as basic hygiene.
export const id = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'invalid id')
