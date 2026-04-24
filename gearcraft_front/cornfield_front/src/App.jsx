import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import './App.css'
import { fallbackCategories } from './catalogFallback.js'

const useStaticFallback =
  import.meta.env.VITE_USE_STATIC_FALLBACK === 'true'

const EMPTY_RUNS = []

function apiUrl(path) {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

function readVitePollMs(key, defaultMs) {
  const raw = import.meta.env[key]
  if (raw === '' || raw === undefined) return defaultMs
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return defaultMs
  return n
}

const REFETCH_SERVICES_MS = readVitePollMs(
  'VITE_REFETCH_SERVICES_MS',
  300_000,
)
const REFETCH_RUNS_MS = readVitePollMs('VITE_REFETCH_RUNS_MS', 180_000)

function truncateLabel(text, max = 42) {
  if (!text || text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function IconFlame() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
    </svg>
  )
}

function IconLinkActivity({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconClockSm({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function IconShieldSm({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}

function IconUsersSm({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCalendar({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function PriceBlock({ price }) {
  const s = String(price ?? '').trim()
  const m = s.match(/^(.+?)\s*(gold)$/i)
  if (m) {
    return (
      <p className="wx-price-row">
        {m[1].trim()}
        <span className="wx-gold">gold</span>
      </p>
    )
  }
  return <p className="wx-price-row">{s}</p>
}

function formatLocalYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildWeekDays() {
  const base = new Date()
  const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const longFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setHours(12, 0, 0, 0)
    d.setDate(base.getDate() + i)
    const dayTitle =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayShort.format(d)
    const daySubtitle = monthDay.format(d)
    return {
      key: d.toDateString(),
      dateKey: formatLocalYmd(d),
      dayTitle,
      daySubtitle,
      longLabel: longFmt.format(d),
      date: d,
    }
  })
}

function parseTimeToMinutes(time) {
  const trimmed = String(time || '').trim()
  if (!trimmed) return null
  const normalized = trimmed.toLowerCase().replace(/\./g, '')
  const twelve = normalized.match(/(\d{1,2})\s*:\s*(\d{2})(?::\d{2})?\s*([ap])m\b/)
  if (twelve) {
    let h = Number(twelve[1])
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
  if (total == null) return String(time || '').trim() || '—'
  const hour24 = Math.floor(total / 60)
  const minutes = total % 60
  const hour12 = ((hour24 + 11) % 12) + 1
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function scheduleCardHeadline(run) {
  const t = (run.team && String(run.team).trim()) || ''
  if (t) return t
  return (run.title && String(run.title).trim()) || 'Run'
}

function scheduleCardActivity(run) {
  const team = (run.team && String(run.team).trim()) || ''
  const raid = (run.raid && String(run.raid).trim()) || ''
  const title = (run.title && String(run.title).trim()) || ''
  if (team) return raid || title || '—'
  return raid || title || '—'
}

function scheduleSlotsLabel(n) {
  if (n == null || n === '') return '—'
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `${v} slot${v === 1 ? '' : 's'} available`
}

function SchedulePanel({
  weekDays,
  scheduleDayIndex,
  setScheduleDayIndex,
  solo,
  runsByDay,
  runsLoading,
  runsError,
}) {
  const selectedDay = weekDays[scheduleDayIndex] || weekDays[0]
  const dateKey = selectedDay?.dateKey
  const rawRuns = dateKey ? (runsByDay[dateKey] ?? EMPTY_RUNS) : EMPTY_RUNS
  const runsForDay = useMemo(() => {
    return [...rawRuns].sort((a, b) => {
      const ta = parseTimeToMinutes(a.time)
      const tb = parseTimeToMinutes(b.time)
      if (ta != null && tb != null) return ta - tb
      if (ta != null) return -1
      if (tb != null) return 1
      return String(a.time).localeCompare(String(b.time))
    })
  }, [rawRuns])

  const openSlots = runsForDay.filter(
    (r) => (Number(r.slotsAvailable) || 0) > 0,
  ).length

  return (
    <div className={solo ? 'wx-sched-block wx-sched-block--solo' : 'wx-sched-block'}>
      <div className="wx-sched-title-row">
        <div className="wx-sched-line-r" aria-hidden />
        <h2 className="wx-sched-h2">
          <IconCalendar />
          Weekly Schedule
        </h2>
        <div className="wx-sched-line-l" aria-hidden />
      </div>
      <p className="wx-sched-sub">
        Next 7 days follow your device calendar. Times shown as stored (reference EST when
        applicable).
      </p>

      {runsError ? (
        <p className="wx-sched-api-err" role="alert">
          Could not load schedule: {runsError}
        </p>
      ) : null}

      <div className="wx-days" role="tablist">
        {weekDays.map((day, i) => {
          const n = runsByDay[day.dateKey]?.length ?? 0
          const has = !runsLoading && n > 0
          return (
            <button
              key={day.key}
              type="button"
              role="tab"
              aria-selected={scheduleDayIndex === i}
              aria-label={`${day.longLabel}, ${runsLoading ? 'loading' : `${n} run${n !== 1 ? 's' : ''}`}`}
              className={`wx-day ${scheduleDayIndex === i ? 'is-active' : ''} ${has ? 'has-runs' : ''} ${!runsLoading && n === 0 && scheduleDayIndex !== i ? 'is-quiet' : ''}`}
              onClick={() => setScheduleDayIndex(i)}
            >
              <span className="wx-day-l">{day.dayTitle}</span>
              <span className="wx-day-d">{day.daySubtitle}</span>
              <span className="wx-day-s">
                {runsLoading ? '…' : `${n} run${n !== 1 ? 's' : ''}`}
              </span>
            </button>
          )
        })}
      </div>
      <div className="wx-sched-panel">
        <div key={selectedDay.key} className="wx-sched-inner">
          <div className="wx-sched-head">
            <span className="wx-sched-date">{selectedDay.longLabel}</span>
            <span className="wx-sched-badge">
              {runsLoading
                ? '…'
                : `${runsForDay.length} run${runsForDay.length !== 1 ? 's' : ''}${
                    runsForDay.length ? ` · ${openSlots} open` : ''
                  }`}
            </span>
          </div>
          {runsLoading ? (
            <p className="wx-sched-loading">Loading schedule…</p>
          ) : runsForDay.length === 0 ? (
            <div className="wx-sched-empty">
              <span className="wx-sched-empty-title">No runs for this date.</span>
              <p>Pick another day above, or check back later.</p>
            </div>
          ) : (
            <div className="wx-sched-runs">
              {runsForDay.map((run) => {
                const slots = Number(run.slotsAvailable)
                const slotsOk = Number.isFinite(slots) && slots > 0
                return (
                  <article
                    key={run.id ?? `${run.title}-${run.time}`}
                    className="wx-sched-run"
                  >
                    <div className="wx-sched-run-head">
                      <h3 className="wx-sched-run-title">{scheduleCardHeadline(run)}</h3>
                      {run.difficulty ? (
                        <span className="wx-sched-run-badge">
                          {String(run.difficulty).toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                    <p className="wx-sched-run-activity">
                      <IconLinkActivity className="wx-sched-run-ic" />
                      <span>{scheduleCardActivity(run)}</span>
                    </p>
                    <p className="wx-sched-run-line wx-sched-run-line--time">
                      <IconClockSm className="wx-sched-run-ic wx-sched-run-ic--light" />
                      <span>{formatTime12h(run.time)} EST</span>
                    </p>
                    {run.loot ? (
                      <p className="wx-sched-run-line wx-sched-run-line--loot">
                        <IconShieldSm className="wx-sched-run-ic wx-sched-run-ic--light" />
                        <span>
                          {/^loot\s*:/i.test(String(run.loot).trim())
                            ? run.loot
                            : `Loot: ${run.loot}`}
                        </span>
                      </p>
                    ) : null}
                    <div className="wx-sched-run-divider" aria-hidden />
                    <p className="wx-sched-run-slots">
                      <IconUsersSm className="wx-sched-run-ic" />
                      <span className={slotsOk ? 'wx-sched-slots-ok' : 'wx-sched-slots-no'}>
                        {scheduleSlotsLabel(run.slotsAvailable)}
                      </span>
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState('catalog')
  const [activeSection, setActiveSection] = useState('all')
  const [scheduleDayIndex, setScheduleDayIndex] = useState(0)

  const weekDays = useMemo(() => buildWeekDays(), [])

  const runQueryRange = useMemo(() => {
    if (!weekDays.length) return null
    return {
      start: weekDays[0].dateKey,
      end: weekDays[weekDays.length - 1].dateKey,
    }
  }, [weekDays])

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/services'))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data.message ||
          data.error ||
          `API returned ${res.status}. Check DATABASE_URL and server logs.`
        throw new Error(msg)
      }
      return data
    },
    staleTime:
      REFETCH_SERVICES_MS > 0 ? Math.max(10_000, REFETCH_SERVICES_MS - 5000) : 600_000,
    refetchInterval:
      REFETCH_SERVICES_MS > 0 ? REFETCH_SERVICES_MS : false,
  })

  const runsQuery = useQuery({
    queryKey: ['runs', runQueryRange?.start, runQueryRange?.end],
    queryFn: async () => {
      const qs = new URLSearchParams({
        startDate: runQueryRange.start,
        endDate: runQueryRange.end,
      })
      const res = await fetch(apiUrl(`/api/runs?${qs}`))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          data.message || data.error || `Request failed (${res.status})`,
        )
      }
      return data.days || {}
    },
    enabled: Boolean(runQueryRange),
    staleTime:
      REFETCH_RUNS_MS > 0 ? Math.max(10_000, REFETCH_RUNS_MS - 5000) : 600_000,
    refetchInterval: REFETCH_RUNS_MS > 0 ? REFETCH_RUNS_MS : false,
  })

  const { categories, dataSource, loadError } = useMemo(() => {
    if (servicesQuery.isPending) {
      return { categories: null, dataSource: 'loading', loadError: null }
    }
    if (servicesQuery.isError) {
      const message =
        servicesQuery.error instanceof Error
          ? servicesQuery.error.message
          : String(servicesQuery.error)
      if (useStaticFallback) {
        return {
          categories: fallbackCategories,
          dataSource: 'static',
          loadError: message,
        }
      }
      return { categories: [], dataSource: 'error', loadError: message }
    }
    const list = servicesQuery.data?.categories || []
    if (list.length) {
      return { categories: list, dataSource: 'postgres', loadError: null }
    }
    return { categories: [], dataSource: 'empty', loadError: null }
  }, [
    servicesQuery.isPending,
    servicesQuery.isError,
    servicesQuery.data,
    servicesQuery.error,
  ])

  const runsByDay = useMemo(() => {
    if (runsQuery.isError) return {}
    return runsQuery.data ?? {}
  }, [runsQuery.isError, runsQuery.data])

  const runsLoading = Boolean(runQueryRange && runsQuery.isLoading)
  const runsError = runsQuery.isError
    ? runsQuery.error instanceof Error
      ? runsQuery.error.message
      : String(runsQuery.error)
    : null

  const sectionId = useCallback((i) => `sec-${i}`, [])

  const scrollToSection = useCallback((id) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setActiveSection('all')
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }, [])

  useEffect(() => {
    if (view !== 'catalog') return
    const onScroll = () => {
      if (window.scrollY < 120) setActiveSection('all')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [view])

  useEffect(() => {
    if (view !== 'catalog' || !categories?.length) return
    const elements = categories.map((_, i) => document.getElementById(sectionId(i)))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.1)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (top?.target?.id) setActiveSection(top.target.id)
      },
      { rootMargin: '-80px 0px -50% 0px', threshold: [0, 0.1, 0.2, 0.35] },
    )
    for (const el of elements) {
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [categories, view, sectionId])

  const openCatalog = () => {
    setView('catalog')
    setTimeout(() => scrollToSection('top'), 0)
  }

  const openSchedule = () => {
    setView('schedule')
    setActiveSection('schedule')
    setScheduleDayIndex(0)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const showCategoryRail =
    view === 'catalog' && categories && categories.length > 0

  return (
    <div className="wx">
      <div className="wx-fx" aria-hidden="true">
        <div className="wx-orb wx-orb--1" />
        <div className="wx-orb wx-orb--2" />
        <div className="wx-orb wx-orb--3" />
        <div className="wx-orb wx-orb--4" />
        <div className="wx-orb wx-orb--5" />
        <div className="wx-orb wx-orb--6" />
      </div>
      <div className="wx-bg-grid" aria-hidden="true" />
      <div className="wx-bottom-fade" aria-hidden="true" />

      <header className="wx-masthead">
        <div className="wx-masthead-inner">
          <button type="button" className="wx-masthead-title" onClick={openCatalog}>
            GEARCRAFT
          </button>
        </div>
      </header>

      {view === 'catalog' && (
        <section className="wx-hero" aria-labelledby="catalog-heading">
          <div className="wx-hero-inner">
            {dataSource === 'loading' && (
              <p className="wx-sr-msg" role="status">
                Loading catalog…
              </p>
            )}
            <div className="wx-hero-pill">
              <span className="wx-hero-pill-dot" />
              <span>Gearcraft</span>
            </div>
            <h1 id="catalog-heading" className="wx-hero-h1">
              <span className="wx-hero-h1-w">Premium</span>{' '}
              <span className="wx-hero-h1-g">Catalog</span>
            </h1>
            <p className="wx-hero-lead">
              Explore our full collection of products and services. Everything you need,
              organized by category.
            </p>
            <div className="wx-hero-line" aria-hidden="true" />
          </div>
        </section>
      )}

      <main className="wx-main">
        <div className="wx-navstrip">
          <div className="wx-navstrip-inner">
            {view === 'catalog' && (
              <>
                <button
                  type="button"
                  className={`wx-cat ${activeSection === 'all' ? 'is-active' : ''}`}
                  onClick={() => scrollToSection('top')}
                >
                  All
                </button>
                {showCategoryRail &&
                  categories.map((cat, i) => {
                    const id = sectionId(i)
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`wx-cat ${activeSection === id ? 'is-active' : ''}`}
                        onClick={() => scrollToSection(id)}
                      >
                        {truncateLabel(cat.name)}
                      </button>
                    )
                  })}
                <span className="wx-navstrip-spacer" />
                <button type="button" className="wx-cat" onClick={openSchedule}>
                  Schedule
                </button>
              </>
            )}
            {view === 'schedule' && (
              <>
                <button type="button" className="wx-cat wx-cat--ghost" onClick={openCatalog}>
                  All Categories
                </button>
                <span className="wx-navstrip-spacer" />
                <button type="button" className="wx-cat is-active" onClick={openSchedule}>
                  Schedule
                </button>
              </>
            )}
          </div>
        </div>

        {dataSource === 'error' && loadError && (
          <div className="wx-alert" role="alert">
            <div className="wx-alert-box">
              <strong>Could not load catalog</strong>
              <p>Please try again shortly.</p>
              {import.meta.env.DEV && (
                <p className="wx-alert-dev">
                  {loadError}
                  <br />
                  <code>.env</code> DATABASE_URL + <code>cd server &amp;&amp; npm start</code>
                </p>
              )}
            </div>
          </div>
        )}

        {view === 'catalog' && (
          <div className="wx-catalog-wrap">
            <div className="wx-catalog">
              {categories &&
                categories.map((category, i) => (
                  <section
                    key={
                      category.id != null ? `cat-${category.id}` : `${category.name}-${i}`
                    }
                    id={sectionId(i)}
                    className="wx-section"
                  >
                    <div className="wx-sec-bar">
                      <div className="wx-sec-line" aria-hidden />
                      <div className="wx-sec-mid">
                        <h2 className="wx-sec-h2">{category.name}</h2>
                        <p className="wx-sec-meta">
                          {category.services.length} services available
                        </p>
                      </div>
                      <div className="wx-sec-line" aria-hidden />
                    </div>
                    <div className="wx-card-grid">
                      {category.services.map((service) => (
                        <article
                          key={
                            service.id != null
                              ? String(service.id)
                              : `${category.name}-${service.name}-${service.price}`
                          }
                          className="wx-card"
                        >
                          <div className="wx-card-inner">
                            <div className="wx-card-head">
                              <h3 className="wx-card-title">{service.name}</h3>
                              <span className="wx-hot">
                                <IconFlame />
                                Hot
                              </span>
                            </div>
                            <p className="wx-card-desc">{service.details}</p>
                            <div className="wx-card-foot">
                              <span className="wx-price-label">Price</span>
                              <PriceBlock price={service.price} />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}

              {categories && categories.length === 0 && dataSource === 'empty' && (
                <p className="wx-empty">No services in the catalog yet.</p>
              )}
            </div>

            <SchedulePanel
              weekDays={weekDays}
              scheduleDayIndex={scheduleDayIndex}
              setScheduleDayIndex={setScheduleDayIndex}
              solo={false}
              runsByDay={runsByDay}
              runsLoading={runsLoading}
              runsError={runsError}
            />
          </div>
        )}

        {view === 'schedule' && (
          <div id="schedule-anchor">
            <SchedulePanel
              weekDays={weekDays}
              scheduleDayIndex={scheduleDayIndex}
              setScheduleDayIndex={setScheduleDayIndex}
              solo
              runsByDay={runsByDay}
              runsLoading={runsLoading}
              runsError={runsError}
            />
          </div>
        )}
      </main>

      <footer className="wx-footer">
        <div className="wx-footer-inner">
          <p className="wx-footer-k">GEARCRAFT</p>
          <p className="wx-footer-copy">© 2026 Gearcraft. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
