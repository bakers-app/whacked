/**
 * Lista colunas da tabela services e algumas linhas (debug local).
 * Uso: npm run inspect  (na pasta server)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { Pool } = pg
const table = process.env.SERVICES_TABLE || 'services'

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  ssl:
    process.env.DATABASE_URL.includes('sslmode=disable') ||
    process.env.PGSSLMODE === 'disable'
      ? false
      : { rejectUnauthorized: false },
})

async function main() {
  const cols = await pool.query(
    `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    [table],
  )
  console.log(`Table public.${table} columns:`)
  for (const r of cols.rows) {
    console.log(`  - ${r.column_name} (${r.data_type})`)
  }

  const sample = await pool.query(`SELECT * FROM public.${quoteIdent(table)} LIMIT 3`)
  console.log('\nSample rows (max 3):')
  console.dir(sample.rows, { depth: 4 })

  await pool.end()
}

function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Invalid table name')
  return `"${name.replace(/"/g, '""')}"`
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
