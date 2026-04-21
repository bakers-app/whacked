import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import pg from 'pg'
import { mapServiceRow } from './mapRow.js'
import { mapRunRow, normalizeRunDateKey } from './mapRunRow.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { Pool } = pg
const app = express()
const port = Number(process.env.API_PORT) || 3001

if (!process.env.DATABASE_URL) {
  console.error(
    'Missing DATABASE_URL. Add it to the project root .env (see .env.example).',
  )
  process.exit(1)
}

const poolMaxRaw = Number(process.env.PG_POOL_MAX)
const poolMax =
  Number.isFinite(poolMaxRaw) && poolMaxRaw >= 1 && poolMaxRaw <= 50
    ? Math.floor(poolMaxRaw)
    : 5

/** TTL em ms para servir a mesma resposta sem bater no PG (0 = desligado). */
function readNonNegIntMs(envKey, defaultMs) {
  const n = Number(process.env[envKey])
  if (!Number.isFinite(n) || n < 0) return defaultMs
  return Math.floor(n)
}

const apiCacheServicesMs = readNonNegIntMs('API_CACHE_SERVICES_MS', 120_000)
const apiCacheRunsMs = readNonNegIntMs('API_CACHE_RUNS_MS', 60_000)

let servicesCache = null // { payload, until }
const runsCache = new Map()

function pruneExpiredRunsCache() {
  const now = Date.now()
  for (const [k, v] of runsCache) {
    if (v.until <= now) runsCache.delete(k)
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolMax,
  ssl:
    process.env.DATABASE_URL.includes('sslmode=disable') ||
    process.env.PGSSLMODE === 'disable'
      ? false
      : { rejectUnauthorized: false },
})

const table = process.env.SERVICES_TABLE || 'services'

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

function isIsoDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/**
 * Runs agendadas por dia (`runs.date` por defeito).
 * Query: startDate, endDate = YYYY-MM-DD (calendário local do cliente).
 */
app.get('/api/runs', async (req, res) => {
  const startDate = req.query.startDate
  const endDate = req.query.endDate
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return res.status(400).json({
      error: 'invalid_params',
      message: 'Provide startDate and endDate as YYYY-MM-DD',
    })
  }
  if (startDate > endDate) {
    return res.status(400).json({
      error: 'invalid_range',
      message: 'startDate must be <= endDate',
    })
  }
  const spanDays = (new Date(endDate) - new Date(startDate)) / 86400000
  if (spanDays > 31) {
    return res.status(400).json({
      error: 'range_too_large',
      message: 'Maximum 31 days per request',
    })
  }

  const runsCacheKey = `${startDate}\t${endDate}`
  if (apiCacheRunsMs > 0) {
    pruneExpiredRunsCache()
    const hit = runsCache.get(runsCacheKey)
    if (hit && Date.now() < hit.until) {
      res.set(
        'Cache-Control',
        `private, max-age=${Math.max(1, Math.ceil(apiCacheRunsMs / 1000))}`,
      )
      return res.json(hit.payload)
    }
  }

  const runsTable = process.env.RUNS_TABLE || 'runs'
  const dateCol = process.env.RUNS_DATE_COLUMN || 'date'
  const timeCol = process.env.RUNS_TIME_COLUMN || 'time'
  const runsPk = resolveRunsPkColumn(process.env)
  const buyersTable = process.env.BUYERS_TABLE || 'buyers'
  const buyersFk = process.env.BUYERS_RUN_FK_COLUMN || 'id_run'
  /** Coluna `buyers.status` (ou outra) para excluir valores “não contam vaga” (cancelled, noshow, …). */
  const buyersStateCol =
    process.env.BUYERS_STATE_COLUMN ||
    process.env.BUYERS_STATUS_COLUMN ||
    'status'
  const skipBuyersCount =
    String(process.env.RUNS_SKIP_BUYERS_SLOT_COUNT || '').toLowerCase() ===
    'true'
  const buyersCountMode = String(
    process.env.BUYERS_COUNT_MODE || 'not_cancelled',
  )
    .toLowerCase()
    .trim()

  let activeCond
  if (buyersCountMode === 'is_paid') {
    const buyersActiveCol =
      process.env.BUYERS_ACTIVE_COLUMN || process.env.BUYERS_STATUS_COLUMN || 'is_paid'
    const activeNumeric =
      String(process.env.BUYERS_ACTIVE_NUMERIC || process.env.BUYERS_STATUS_NUMERIC || '').toLowerCase() === 'true' ||
      process.env.BUYERS_ACTIVE_NUMERIC === '1' ||
      process.env.BUYERS_STATUS_NUMERIC === '1'
    const activeVarchar =
      String(process.env.BUYERS_ACTIVE_VARCHAR || '').toLowerCase() === 'true'
    activeCond = activeNumeric
      ? `b.${quoteIdent(buyersActiveCol)} = 1`
      : activeVarchar
        ? `(LOWER(TRIM(COALESCE(b.${quoteIdent(buyersActiveCol)}::text, ''))) ~ '^(true|t|1|yes)$')`
        : `b.${quoteIdent(buyersActiveCol)} IS TRUE`
  } else {
    const raw =
      process.env.BUYERS_CANCELLED_VALUES ?? 'cancelled,noshow'
    const tokens = String(raw)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[a-z0-9_-]+$/.test(s))
    const cancelled = tokens.length ? tokens : ['cancelled', 'noshow']
    const inList = cancelled.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ')
    activeCond = `NOT (LOWER(TRIM(COALESCE(b.${quoteIdent(buyersStateCol)}::text, ''))) IN (${inList}))`
  }

  // Opt-in: só zera slots por horário passado se RUNS_ZERO_SLOTS_WHEN_PAST=true
  const zeroSlotsWhenPast =
    String(process.env.RUNS_ZERO_SLOTS_WHEN_PAST || '').toLowerCase() === 'true'
  const scheduleTz = quoteTzLiteral(
    process.env.RUNS_SCHEDULE_TIMEZONE || 'America/New_York',
  )
  const pastSelect = zeroSlotsWhenPast
    ? `, (
      r.${quoteIdent(dateCol)} IS NOT NULL
      AND (
        (r.${quoteIdent(dateCol)}::date + COALESCE(
          NULLIF(trim(both from r.${quoteIdent(timeCol)}::text), ''),
          '00:00'
        )::time) AT TIME ZONE '${scheduleTz}'
      ) < now()
    ) AS wx_run_in_past`
    : ''

  try {
    const maxBuyersCol = process.env.RUNS_MAX_BUYERS_COLUMN || 'max_buyers'
    const slotsTail = skipBuyersCount
      ? `, 0::int AS wx_buyers_taken, COALESCE(r.${quoteIdent(maxBuyersCol)}, 0)::int AS wx_slots_remaining`
      : `, COALESCE(sub.wx_cnt, 0)::int AS wx_buyers_taken,
      GREATEST(0, COALESCE(r.${quoteIdent(maxBuyersCol)}, 0) - COALESCE(sub.wx_cnt, 0))::int AS wx_slots_remaining`
    const lateralJoin = skipBuyersCount
      ? ''
      : `
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS wx_cnt
        FROM ${quoteIdent(buyersTable)} b
        WHERE b.${quoteIdent(buyersFk)}::text = r.${quoteIdent(runsPk)}::text
          AND (${activeCond})
      ) sub ON true
    `

    const sql = `
      SELECT r.*${slotsTail}${pastSelect}
      FROM ${quoteIdent(runsTable)} r
      ${lateralJoin}
      WHERE r.${quoteIdent(dateCol)}::date >= $1::date
        AND r.${quoteIdent(dateCol)}::date <= $2::date
      ORDER BY r.${quoteIdent(dateCol)}::date ASC,
        r.${quoteIdent(timeCol)} ASC NULLS LAST
    `
    const result = await pool.query(sql, [startDate, endDate])
    const days = {}
    for (const row of result.rows) {
      const key = normalizeRunDateKey(row[dateCol] ?? row.date)
      if (!key) continue
      if (!days[key]) days[key] = []
      days[key].push(mapRunRow(row, process.env))
    }
    const payload = {
      startDate,
      endDate,
      days,
      source: 'postgres',
    }
    if (apiCacheRunsMs > 0) {
      runsCache.set(runsCacheKey, {
        payload,
        until: Date.now() + apiCacheRunsMs,
      })
      res.set(
        'Cache-Control',
        `private, max-age=${Math.max(1, Math.ceil(apiCacheRunsMs / 1000))}`,
      )
    } else {
      res.set('Cache-Control', 'no-store')
    }
    res.json(payload)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: 'database_query_failed',
      message: err.message,
    })
  }
})

app.get('/api/services', async (_req, res) => {
  try {
    if (apiCacheServicesMs > 0 && servicesCache && Date.now() < servicesCache.until) {
      res.set(
        'Cache-Control',
        `private, max-age=${Math.max(1, Math.ceil(apiCacheServicesMs / 1000))}`,
      )
      return res.json(servicesCache.payload)
    }

    const sql = buildServicesSql(process.env, table)
    const result = await pool.query(sql)

    const mapped = result.rows.map((row) => mapServiceRow(row, process.env))

    const catKey = (s) =>
      s.idServiceCategory != null ? String(s.idServiceCategory) : '_uncat'

    const order = []
    const byKey = new Map()

    for (const s of mapped) {
      const key = catKey(s)
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: s.idServiceCategory,
          name: s.category,
          services: [],
        })
        order.push(key)
      }
      byKey.get(key).services.push({
        id: s.id,
        name: s.name,
        details: s.details,
        price: s.price,
      })
    }

    order.sort((a, b) => {
      if (a === '_uncat') return 1
      if (b === '_uncat') return -1
      const na = Number(a)
      const nb = Number(b)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return String(a).localeCompare(String(b))
    })

    const categories = order.map((key) => {
      const block = byKey.get(key)
      return {
        id: block.id,
        name: block.name,
        services: block.services,
      }
    })

    const payload = { categories, source: 'postgres' }
    if (apiCacheServicesMs > 0) {
      servicesCache = {
        payload,
        until: Date.now() + apiCacheServicesMs,
      }
      res.set(
        'Cache-Control',
        `private, max-age=${Math.max(1, Math.ceil(apiCacheServicesMs / 1000))}`,
      )
    } else {
      res.set('Cache-Control', 'no-store')
    }
    res.json(payload)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: 'database_query_failed',
      message: err.message,
    })
  }
})

/**
 * PK da tabela `runs` (ex.: id). Não confundir com `buyers.id_run`.
 * Se RUNS_PK_COLUMN vier como id_run, corrigimos para id e avisamos no log.
 */
function resolveRunsPkColumn(env) {
  let pk = String(env.RUNS_PK_COLUMN || 'id').trim() || 'id'
  const lower = pk.toLowerCase()
  if (lower === 'id_run') {
    console.warn(
      '[api/runs] RUNS_PK_COLUMN=id_run refers to buyers, not runs; using id',
    )
    pk = 'id'
  }
  return pk
}

function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error('Invalid identifier')
  }
  return `"${name.replace(/"/g, '""')}"`
}

function quoteTzLiteral(tz) {
  const s = String(tz || 'America/New_York').trim() || 'America/New_York'
  if (!/^[A-Za-z0-9_/+-]+$/.test(s)) return 'America/New_York'
  return s.replace(/'/g, "''")
}

/**
 * Lista serviços ordenados por id_service_category.
 * Com SERVICE_CATEGORY_TABLE (padrão: service_categories), faz JOIN para o nome da categoria.
 * Desative o JOIN com SERVICE_CATEGORY_JOIN=false se não existir tabela de categorias.
 */
function buildServicesSql(env, servicesTable) {
  const fk = env.SERVICE_CATEGORY_FK_COLUMN || 'id_service_category'
  const joinOn =
    String(env.SERVICE_CATEGORY_JOIN || 'true').toLowerCase() !== 'false'

  if (!joinOn) {
    const orderCol = env.SERVICES_ORDER_BY || fk
    const orderDir =
      String(env.SERVICES_ORDER_DIR || 'asc').toLowerCase() === 'desc'
        ? 'DESC'
        : 'ASC'
    const tie = env.SERVICES_TIE_BREAK || 'id'
    return `SELECT * FROM ${quoteIdent(servicesTable)} ORDER BY ${quoteIdent(orderCol)} ${orderDir} NULLS LAST, ${quoteIdent(tie)} ASC`
  }

  const catTable = env.SERVICE_CATEGORY_TABLE || 'service_categories'
  const catPk = env.SERVICE_CATEGORY_ID_COLUMN || 'id'
  const catName = env.SERVICE_CATEGORY_NAME_COLUMN || 'name'
  const tie = env.SERVICES_TIE_BREAK || 'id'

  return `
    SELECT
      s.*,
      sc.${quoteIdent(catName)} AS service_category_title
    FROM ${quoteIdent(servicesTable)} s
    LEFT JOIN ${quoteIdent(catTable)} sc
      ON sc.${quoteIdent(catPk)} = s.${quoteIdent(fk)}
    ORDER BY s.${quoteIdent(fk)} ASC NULLS LAST, s.${quoteIdent(tie)} ASC
  `
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Whacked API listening on http://0.0.0.0:${port}`)
})
