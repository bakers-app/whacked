import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')

/** Colunas da planilha PLAYERS RECRUIT (linha de cabeçalho). */
export const RECRUIT_SHEET_HEADERS = [
  'Timestamp',
  'Discord',
  'IGN',
  'Role',
  'Conteúdos',
  'Experiência boosting',
  'Outras comunidades',
  'Idioma',
  '(Achiev) Consegue fornecer?',
  '(Achiev) Tipos',
  '(Leveling) Horas/dias',
  '(Leveling) Solo/amigo',
  '(M+) Raider.io',
  '(M+) Time de keys?',
  '(M+) Horas do time',
  '(PVP) Experiência',
  'Officer / RL',
  'Táticas / comps',
  'Main / Specs',
  'Disponibilidade',
  'Compromisso',
  'Foco gold IRL',
  'Indicação',
  'Logs',
  'Experiência de raid',
  'UI',
  'Chars equipados',
  'ACK',
]

const DEFAULT_SPREADSHEET_ID = '1ZU5PBOul36K2rZSSxuViJ0UYDn6aUTz5NbYTY97i-SQ'

export function applicationToSheetRow(application) {
  const contents = Array.isArray(application.contents)
    ? application.contents.join(', ')
    : String(application.contents || '')

  return [
    new Date().toISOString(),
    application.discord || '',
    application.ign || '',
    application.role || '',
    contents,
    application.boostingExperience || '',
    application.otherCommunities || '',
    application.language || '',
    application.achievementCanProvide || '',
    application.achievementTypes || '',
    application.levelingHours || '',
    application.levelingSoloOrFriend || '',
    application.mythicRaiderIo || '',
    application.mythicHasTeam || '',
    application.mythicTeamHours || '',
    application.pvpExperience || '',
    application.wasOfficerOrRl || '',
    application.handledTactics || '',
    application.mainClassSpec || '',
    application.availability || '',
    application.commitmentUnderstood || '',
    application.goldFarmAwareness || '',
    application.recommendedBy || '',
    application.logsLink || '',
    application.raidExperience || '',
    application.uiImageLink || '',
    application.charactersWillingness || '',
    application.formAck || '',
  ]
}

function trim(value) {
  return String(value ?? '').trim()
}

function parseServiceAccountObject(parsed) {
  return {
    clientEmail: trim(parsed.client_email),
    privateKey: String(parsed.private_key || '').replace(/\\n/g, '\n'),
  }
}

function readServiceAccountFromEnv() {
  const fileRel = trim(process.env.GOOGLE_SERVICE_ACCOUNT_FILE)
  if (fileRel) {
    const filePath = path.isAbsolute(fileRel)
      ? fileRel
      : path.join(ROOT_DIR, fileRel)
    if (!fs.existsSync(filePath)) {
      throw new Error(`GOOGLE_SERVICE_ACCOUNT_FILE not found: ${filePath}`)
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return parseServiceAccountObject(parsed)
  }

  const rawJson = trim(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  if (rawJson) {
    try {
      return parseServiceAccountObject(JSON.parse(rawJson))
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON')
    }
  }

  const clientEmail = trim(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  const privateKey = String(process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .trim()

  if (clientEmail && privateKey) {
    return { clientEmail, privateKey }
  }

  return null
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

async function getSheetsAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(unsigned), privateKey)
    .toString('base64url')
  const assertion = `${unsigned}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Sheets OAuth failed (${res.status}): ${data.error_description || data.error || 'no_token'}`,
    )
  }
  return data.access_token
}

function encodeA1SheetRange(tabName, a1) {
  const tab = String(tabName || 'Página1').replace(/'/g, "''")
  return encodeURIComponent(`'${tab}'!${a1}`)
}

async function resolveSheetTabName(accessToken, spreadsheetId, preferredTab) {
  const metaUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `?fields=sheets.properties.title`
  const res = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Sheets metadata failed (${res.status}): ${data.error?.message || 'unknown'}`,
    )
  }

  const titles = (data.sheets || [])
    .map((s) => s?.properties?.title)
    .filter(Boolean)

  if (!titles.length) {
    throw new Error('Spreadsheet has no sheets/tabs')
  }

  if (preferredTab && titles.includes(preferredTab)) return preferredTab
  return titles[0]
}

async function ensureHeaderRow(accessToken, spreadsheetId, tabName) {
  const range = encodeA1SheetRange(tabName, 'A1:AB1')
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
  const getRes = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const getData = await getRes.json().catch(() => ({}))
  if (!getRes.ok) {
    throw new Error(
      `Sheets read header failed (${getRes.status}): ${getData.error?.message || 'unknown'}`,
    )
  }

  const first = getData.values?.[0]?.[0]
  if (String(first || '').trim()) return { wroteHeaders: false }

  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [RECRUIT_SHEET_HEADERS] }),
  })
  if (!putRes.ok) {
    const putData = await putRes.json().catch(() => ({}))
    throw new Error(
      `Sheets write header failed (${putRes.status}): ${putData.error?.message || 'unknown'}`,
    )
  }
  return { wroteHeaders: true }
}

/**
 * Com "Formatar → Tabela", o Sheets reserva muitas linhas vazias e o
 * values.append grava DEPOIS da tabela (fora da vista / além do grid).
 * Escrevemos na primeira linha vazia após o cabeçalho.
 */
async function findNextEmptyRow(accessToken, spreadsheetId, tabName) {
  const range = encodeA1SheetRange(tabName, 'A:A')
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Sheets scan rows failed (${res.status}): ${data.error?.message || 'unknown'}`,
    )
  }

  const values = data.values || []
  // índice 0 = cabeçalho; procura o primeiro buraco depois dele
  for (let i = 1; i < values.length; i += 1) {
    if (!String(values[i]?.[0] ?? '').trim()) return i + 1
  }
  return Math.max(values.length, 1) + 1
}

async function getSheetIdByTitle(accessToken, spreadsheetId, tabName) {
  const metaUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    `?fields=sheets(properties(sheetId,title))`
  const res = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Sheets sheetId lookup failed (${res.status}): ${data.error?.message || 'unknown'}`,
    )
  }
  const match = (data.sheets || []).find((s) => s?.properties?.title === tabName)
  const sheetId = match?.properties?.sheetId
  if (sheetId == null) throw new Error(`Sheet tab not found: ${tabName}`)
  return sheetId
}

async function ensureRowExists(accessToken, spreadsheetId, sheetId, rowNumber) {
  // rowNumber is 1-based; insertDimension uses 0-based indexes
  const startIndex = rowNumber - 1
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex,
                endIndex: startIndex + 1,
              },
              inheritFromBefore: true,
            },
          },
        ],
      }),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `Sheets insert row failed (${res.status}): ${data.error?.message || 'unknown'}`,
    )
  }
}

async function writeRowAt(
  accessToken,
  spreadsheetId,
  tabName,
  sheetId,
  rowNumber,
  rowValues,
) {
  const range = encodeA1SheetRange(tabName, `A${rowNumber}:AB${rowNumber}`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`
  let res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  })
  let data = await res.json().catch(() => ({}))

  if (
    !res.ok &&
    /exceeds grid limits/i.test(String(data.error?.message || ''))
  ) {
    await ensureRowExists(accessToken, spreadsheetId, sheetId, rowNumber)
    res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowValues] }),
    })
    data = await res.json().catch(() => ({}))
  }

  if (!res.ok) {
    throw new Error(
      `Sheets write row failed (${res.status}): ${data.error?.message || 'unknown'}`,
    )
  }
  return data
}

async function appendViaServiceAccount(application) {
  const creds = readServiceAccountFromEnv()
  if (!creds?.clientEmail || !creds?.privateKey) {
    return { used: false }
  }

  const spreadsheetId =
    trim(process.env.RECRUIT_SHEETS_SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID
  const preferredTab = trim(process.env.RECRUIT_SHEETS_TAB)
  const accessToken = await getSheetsAccessToken(creds.clientEmail, creds.privateKey)
  const tabName = await resolveSheetTabName(accessToken, spreadsheetId, preferredTab)
  const sheetId = await getSheetIdByTitle(accessToken, spreadsheetId, tabName)

  await ensureHeaderRow(accessToken, spreadsheetId, tabName)

  const nextRow = await findNextEmptyRow(accessToken, spreadsheetId, tabName)
  await writeRowAt(
    accessToken,
    spreadsheetId,
    tabName,
    sheetId,
    nextRow,
    applicationToSheetRow(application),
  )
  return { used: true, method: 'service_account', tab: tabName, row: nextRow }
}

async function appendViaAppsScript(application) {
  const webhookURL = trim(process.env.RECRUIT_SHEETS_WEBHOOK_URL)
  if (!webhookURL) return { used: false }

  const secret = trim(process.env.RECRUIT_SHEETS_SECRET)
  const body = JSON.stringify({
    secret: secret || undefined,
    headers: RECRUIT_SHEET_HEADERS,
    values: applicationToSheetRow(application),
  })

  const res = await postAppsScript(webhookURL, body)
  const text = await res.text().catch(() => '')

  if (res.ok) {
    if (text && text.trimStart().startsWith('<!DOCTYPE')) {
      const err = new Error(
        'Sheets Apps Script returned HTML 403. Use Service Account instead (GOOGLE_SERVICE_ACCOUNT_FILE).',
      )
      err.status = 403
      throw err
    }
    try {
      const parsed = text ? JSON.parse(text) : { ok: true }
      if (parsed && parsed.ok === false) {
        throw new Error(parsed.error || 'sheets_rejected')
      }
    } catch (e) {
      if (e instanceof SyntaxError) return { used: true, method: 'apps_script' }
      throw e
    }
    return { used: true, method: 'apps_script' }
  }

  const err = new Error(
    `Sheets webhook HTTP ${res.status}${text ? `: ${String(text).slice(0, 200)}` : ''}`,
  )
  err.status = res.status
  throw err
}

async function postAppsScript(url, body, redirectsLeft = 5) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
    redirect: 'manual',
  })

  if (redirectsLeft > 0 && res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (location) return postAppsScript(location, body, redirectsLeft - 1)
  }

  return res
}

export async function appendRecruitToSheets(application) {
  const viaSa = await appendViaServiceAccount(application)
  if (viaSa.used) return viaSa

  const viaScript = await appendViaAppsScript(application)
  if (viaScript.used) return viaScript

  return { used: false }
}

/** Só cria a linha de cabeçalho se a planilha estiver vazia. */
export async function seedRecruitSheetHeaders() {
  const creds = readServiceAccountFromEnv()
  if (!creds?.clientEmail || !creds?.privateKey) {
    throw new Error('Service account not configured')
  }
  const spreadsheetId =
    trim(process.env.RECRUIT_SHEETS_SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID
  const preferredTab = trim(process.env.RECRUIT_SHEETS_TAB)
  const accessToken = await getSheetsAccessToken(creds.clientEmail, creds.privateKey)
  const tabName = await resolveSheetTabName(accessToken, spreadsheetId, preferredTab)
  const result = await ensureHeaderRow(accessToken, spreadsheetId, tabName)
  return { tab: tabName, ...result }
}

export function isRecruitSheetsConfigured() {
  try {
    return Boolean(readServiceAccountFromEnv() || trim(process.env.RECRUIT_SHEETS_WEBHOOK_URL))
  } catch {
    return false
  }
}
