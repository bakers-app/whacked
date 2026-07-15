const REQUIRED_FIELDS = [
  'email',
  'role',
  'wasOfficerOrRl',
  'handledTactics',
  'mainClassSpec',
  'availability',
  'commitmentUnderstood',
  'goldFarmAwareness',
  'ign',
  'discord',
  'logsLink',
  'raidExperience',
  'uiImageLink',
  'charactersWillingness',
  'formAck',
]

function trim(value) {
  return String(value ?? '').trim()
}

function truncate(value, limit) {
  const text = String(value ?? '')
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 3))}...`
}

function field(name, value, inline = false) {
  const v = trim(value)
  if (!v || v === '—') return null
  return {
    name,
    value: truncate(v, 1024),
    inline,
  }
}

function compactFields(fields) {
  return fields.filter(Boolean)
}

export function validateRecruitBody(body) {
  const data = body && typeof body === 'object' ? body : {}
  const missing = []

  for (const key of REQUIRED_FIELDS) {
    if (!trim(data[key])) missing.push(key)
  }

  const contents = Array.isArray(data.contents)
    ? data.contents.map((item) => trim(item)).filter(Boolean)
    : []
  if (!contents.length) missing.push('contents')

  if (missing.length) {
    return {
      ok: false,
      error: {
        error: 'missing_fields',
        message: `Required fields missing: ${missing.join(', ')}`,
      },
    }
  }

  const email = trim(data.email)
  if (!email.includes('@') || !email.includes('.')) {
    return {
      ok: false,
      error: {
        error: 'invalid_email',
        message: 'Please provide a valid email address.',
      },
    }
  }

  const application = {
    email,
    contents,
    role: trim(data.role),
    boostingExperience: trim(data.boostingExperience),
    otherCommunities: trim(data.otherCommunities),
    language: trim(data.language),
    achievementCanProvide: trim(data.achievementCanProvide),
    achievementTypes: trim(data.achievementTypes),
    levelingHours: trim(data.levelingHours),
    levelingSoloOrFriend: trim(data.levelingSoloOrFriend),
    mythicRaiderIo: trim(data.mythicRaiderIo),
    mythicHasTeam: trim(data.mythicHasTeam),
    mythicTeamHours: trim(data.mythicTeamHours),
    pvpExperience: trim(data.pvpExperience),
    wasOfficerOrRl: trim(data.wasOfficerOrRl),
    handledTactics: trim(data.handledTactics),
    mainClassSpec: trim(data.mainClassSpec),
    availability: trim(data.availability),
    commitmentUnderstood: trim(data.commitmentUnderstood),
    goldFarmAwareness: trim(data.goldFarmAwareness),
    recommendedBy: trim(data.recommendedBy),
    ign: trim(data.ign),
    discord: trim(data.discord),
    logsLink: trim(data.logsLink),
    raidExperience: trim(data.raidExperience),
    uiImageLink: trim(data.uiImageLink),
    charactersWillingness: trim(data.charactersWillingness),
    formAck: trim(data.formAck),
  }

  return { ok: true, application }
}

export function buildRecruitWebhookPayload(application) {
  const contents = application.contents.join(', ')
  const content = `**Novo apply** · \`${truncate(application.ign, 40)}\` · ${application.role} · Discord: \`${truncate(application.discord, 40)}\``

  const main = {
    title: 'Gearcraft — Recruit',
    description: truncate(`Apply de **${application.ign}**`, 4096),
    color: 0xa855f7,
    timestamp: new Date().toISOString(),
    footer: { text: 'gearcraft.gg/recruit · sem persistência no banco' },
    fields: compactFields([
      field('Email', application.email, true),
      field('Discord', application.discord, true),
      field('IGN', application.ign, true),
      field('Role', application.role, true),
      field('Conteudos', contents, true),
      field('Idioma', application.language || '—', true),
      field('Disponibilidade', application.availability, false),
      field('Main / Specs', application.mainClassSpec, false),
      field('Logs', application.logsLink, false),
      field('UI', application.uiImageLink, false),
    ]),
  }

  const background = {
    title: 'Background & compromisso',
    color: 0x7c3aed,
    fields: compactFields([
      field('Experiencia boosting', application.boostingExperience || '—', false),
      field('Outras comunidades', application.otherCommunities || '—', false),
      field('Officer / RL', application.wasOfficerOrRl, true),
      field('Taticas / comps', application.handledTactics, true),
      field('Experiencia de raid', application.raidExperience, false),
      field('Indicacao', application.recommendedBy || '—', true),
      field('Compromisso', application.commitmentUnderstood, false),
      field('Foco gold IRL', application.goldFarmAwareness, true),
      field('Chars equipados', application.charactersWillingness, true),
      field('ACK', application.formAck, true),
    ]),
  }

  const contentSpecific = compactFields([
    field('(Achiev) Consegue fornecer?', application.achievementCanProvide || '—', false),
    field('(Achiev) Tipos', application.achievementTypes || '—', false),
    field('(Leveling) Horas/dias', application.levelingHours || '—', false),
    field('(Leveling) Solo/amigo', application.levelingSoloOrFriend || '—', false),
    field('(M+) Raider.io / logs', application.mythicRaiderIo || '—', false),
    field('(M+) Tem time de keys?', application.mythicHasTeam || '—', true),
    field('(M+) Horas do time', application.mythicTeamHours || '—', false),
    field('(PVP) Experiencia', application.pvpExperience || '—', false),
  ])

  const embeds = [main, background]
  if (contentSpecific.length) {
    embeds.push({
      title: 'Perguntas por conteudo',
      color: 0x6366f1,
      fields: contentSpecific,
    })
  }

  return { content, embeds }
}

export async function postRecruitWebhook(webhookURL, payload) {
  const res = await fetch(webhookURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (res.ok) return

  const text = await res.text().catch(() => '')
  const err = new Error(
    `Discord webhook HTTP ${res.status}${text ? `: ${trim(text).slice(0, 300)}` : ''}`,
  )
  err.status = res.status
  throw err
}
