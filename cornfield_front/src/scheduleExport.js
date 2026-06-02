function parseTimeToMinutes(time) {
  const trimmed = String(time || '').trim()
  if (!trimmed) return null
  const normalized = trimmed.toLowerCase().replace(/\./g, '')
  const twelve = normalized.match(/(\d{1,2})\s*:\s*(\d{2})(?::\d{2})?\s*([ap])m\b/)
  if (twelve) {
    const h = Number(twelve[1])
    const m = Number(twelve[2])
    const ap = twelve[3]
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    const h24 = (h % 12) + (ap === 'p' ? 12 : 0)
    return h24 * 60 + m
  }
  const twenty = normalized.match(/\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)(?::\d{2})?\b/)
  if (!twenty) return null
  return Number(twenty[1]) * 60 + Number(twenty[2])
}

function formatTime12h(time) {
  const total = parseTimeToMinutes(time)
  if (total == null) return String(time || '').trim() || ''
  const hour24 = Math.floor(total / 60)
  const minutes = total % 60
  const hour12 = ((hour24 + 11) % 12) + 1
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function cardHeadline(run) {
  const team = (run.team && String(run.team).trim()) || ''
  if (team) return team
  return (run.title && String(run.title).trim()) || 'Run'
}

function cardActivity(run) {
  const team = (run.team && String(run.team).trim()) || ''
  const raid = (run.raid && String(run.raid).trim()) || ''
  const title = (run.title && String(run.title).trim()) || ''
  if (team) return raid || title || ''
  return raid || title || ''
}

function slotsLabel(n) {
  if (n == null || n === '') return ''
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return v
}

function lootText(loot) {
  const s = String(loot || '').trim()
  if (!s) return ''
  return /^loot\s*:/i.test(s) ? s : `Loot: ${s}`
}

function sortRuns(runs) {
  return [...runs].sort((a, b) => {
    const ta = parseTimeToMinutes(a.time)
    const tb = parseTimeToMinutes(b.time)
    if (ta != null && tb != null) return ta - tb
    if (ta != null) return -1
    if (tb != null) return 1
    return String(a.time).localeCompare(String(b.time))
  })
}

const HEADERS = [
  'Date',
  'Day',
  'Time (EST)',
  'Team',
  'Raid / activity',
  'Difficulty',
  'Loot',
  'Slots available',
]

/**
 * @param {{ weekDays: Array<{ dateKey: string, longLabel: string, dayTitle: string }>, runsByDay: Record<string, Array>, brandName?: string }} opts
 */
export async function downloadWeeklyScheduleXlsx({
  weekDays,
  runsByDay,
  brandName = 'Schedule',
}) {
  const XLSX = await import('xlsx')
  const rows = [HEADERS]

  for (const day of weekDays) {
    const runs = sortRuns(runsByDay[day.dateKey] ?? [])
    for (const run of runs) {
      rows.push([
        day.dateKey,
        day.longLabel,
        formatTime12h(run.time),
        cardHeadline(run),
        cardActivity(run),
        run.difficulty ? String(run.difficulty).trim() : '',
        lootText(run.loot),
        slotsLabel(run.slotsAvailable),
      ])
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 12 },
    { wch: 22 },
    { wch: 28 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
  ]
  if (rows.length > 1) {
    ws['!autofilter'] = { ref: `A1:H${rows.length}` }
  }

  const wb = XLSX.utils.book_new()
  const sheetName = String(brandName).slice(0, 31) || 'Schedule'
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const start = weekDays[0]?.dateKey || 'week'
  const end = weekDays[weekDays.length - 1]?.dateKey || ''
  const filename =
    end && end !== start ? `schedule-${start}-to-${end}.xlsx` : `schedule-${start}.xlsx`

  XLSX.writeFile(wb, filename)
}
