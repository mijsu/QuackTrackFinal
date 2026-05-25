// ─── PostgreSQL connection for QuackTrack ───────────────────────────────────
// Supports both local development and Render deployment.
// On Render, set DATABASE_URL in the environment dashboard.
// In development, it falls back to the .env file or a hardcoded local URL.

// Determine the PostgreSQL URL:
// 1. If DATABASE_URL is already set (Render sets this), use it
// 2. Otherwise, fall back to the .env file value
const POSTGRES_URL =
  process.env.DATABASE_URL ||
  'postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15'

// Ensure the URL is set before Prisma Client loads
process.env.DATABASE_URL = POSTGRES_URL

// ─── NOW import PrismaClient (it will read process.env.DATABASE_URL) ─────────
import { PrismaClient } from '@prisma/client'

// ─── Global singleton for dev mode (prevent connection leaks on hot reload) ──
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: POSTGRES_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
