/**
 * Mapeia uma linha de `runs` para o JSON da agenda.
 * Colunas padrão em snake_case PostgreSQL; override via env RUNS_*.
 */

import { resolveTeamLabel } from './teamNames.js'

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return row[k]
  }
  return null
}

function num(v) {
  if (v == null || v === '') return null
  if (typeof v === 'bigint') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Valor numérico presente na linha (ignora string vazia). */
function nonEmptyNumeric(row, key) {
  if (row == null || key == null) return null
  const v = row[key]
  if (v == null) return null
  if (typeof v === 'string' && v.trim() === '') return null
  const n = num(v)
  return n
}

/**
 * Vagas na agenda:
 * 1) override opcional RUNS_SLOTS_COLUMN (coluna na linha do run);
 * 2) `wx_slots_remaining` na API (max_buyers − COUNT buyers; padrão exclui só status cancelado);
 * 3) legado: max_buyers − wx_buyers_active_count; depois slot_available / etc.
 */
function getSlots(row, env) {
  const slotsCol =
    typeof env.RUNS_SLOTS_COLUMN === 'string'
      ? env.RUNS_SLOTS_COLUMN.trim()
      : env.RUNS_SLOTS_COLUMN
  if (slotsCol) {
    const mb = String(env.RUNS_MAX_BUYERS_COLUMN || 'max_buyers').toLowerCase()
    const sc = slotsCol.toLowerCase()
    // Erro comum no .env: RUNS_SLOTS_COLUMN=max_buyers → devolve sempre o teto, ignora compradores
    if (sc !== mb && sc !== 'maxbuyers') {
      const n = nonEmptyNumeric(row, slotsCol)
      if (n !== null) return n
    }
  }

  const fromSql =
    nonEmptyNumeric(row, 'wx_slots_remaining') ??
    nonEmptyNumeric(row, 'wxSlotsRemaining')
  if (fromSql !== null) return fromSql

  const maxB =
    nonEmptyNumeric(row, env.RUNS_MAX_BUYERS_COLUMN || 'max_buyers') ??
    nonEmptyNumeric(row, 'maxBuyers')
  if (maxB !== null) {
    const taken =
      nonEmptyNumeric(row, 'wx_buyers_active_count') ??
      nonEmptyNumeric(row, 'wxBuyersActiveCount') ??
      0
    return Math.max(0, maxB - taken)
  }

  for (const k of [
    'slot_available',
    'slotavailable',
    'slotAvailable',
    'slots_available',
  ]) {
    const n = nonEmptyNumeric(row, k)
    if (n !== null) return n
  }
  return null
}

/** yyyy-MM-dd a partir de Date do PG, string ISO ou texto date. */
export function normalizeRunDateKey(value) {
  if (value == null) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

export function mapRunRow(row, env) {
  const timeCol = env.RUNS_TIME_COLUMN || 'time'
  const raidCol = env.RUNS_RAID_COLUMN || 'raid'
  const diffCol = env.RUNS_DIFFICULTY_COLUMN || 'difficulty'
  const teamCol = env.RUNS_TEAM_COLUMN || 'team'
  const nameCol = env.RUNS_NAME_COLUMN || 'name'
  const lootCol = env.RUNS_LOOT_COLUMN || 'loot'

  const rawId = row.id ?? row.id_run
  const id = rawId != null ? String(rawId) : null
  const timeRaw = row[timeCol] ?? row.time
  let time = ''
  if (timeRaw instanceof Date) {
    time = timeRaw.toISOString().slice(11, 16)
  } else if (timeRaw != null) {
    time = String(timeRaw).trim()
  }

  const raid = String(row[raidCol] ?? row.raid ?? '').trim()
  const difficulty = String(row[diffCol] ?? row.difficulty ?? '').trim()
  const teamRaw = pick(row, [
    teamCol,
    'team',
    'id_team',
    'idTeam',
    'id_team_discord',
  ])
  const teamResolved = resolveTeamLabel(teamRaw)
  const team = teamResolved ? String(teamResolved).trim() : ''
  const name = String(
    row[nameCol] ?? pick(row, ['title', 'run_name', 'label']) ?? '',
  ).trim()

  const loot = String(row[lootCol] ?? row.loot ?? '').trim()

  let slotsAvailable = getSlots(row, env)
  if (
    String(env.RUNS_ZERO_SLOTS_WHEN_PAST || '').toLowerCase() === 'true' &&
    row.wx_run_in_past === true
  ) {
    slotsAvailable = 0
  }

  const title =
    name ||
    [raid, difficulty].filter(Boolean).join(' ') ||
    'Run'

  return {
    id,
    time,
    title,
    raid: raid || null,
    difficulty: difficulty || null,
    team: team || null,
    loot: loot || null,
    slotsAvailable,
    buyersTaken:
      nonEmptyNumeric(row, 'wx_buyers_taken') ??
      nonEmptyNumeric(row, 'wxBuyersTaken'),
  }
}
