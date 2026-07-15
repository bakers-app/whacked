import { useMemo, useState } from 'react'
import './RecruitForm.css'

const CONTENT_OPTIONS = [
  'Raid',
  'Mythic Plus',
  'Leveling',
  'PVP',
  'Achievements',
]

const ROLE_OPTIONS = ['Tank', 'Healer', 'Dps']

const LANGUAGE_OPTIONS = [
  { value: 'Si yo soy pero solo hablo espanol', label: 'Si yo soy pero solo hablo español' },
  { value: 'Si yo soy y comprendo english', label: 'Si yo soy y comprendo english' },
  { value: 'No soy', label: 'No soy' },
]

const OFFICER_OPTIONS = [
  'Sim, já fui raid leader',
  'Sim, já fui officer',
  'Nunca fui',
]

const TACTICS_OPTIONS = ['Sim', 'Não', 'Nunca fui']

const AVAILABILITY_OPTIONS = [
  'Turno da tarde ( 12 horas até as 20 horas)',
  'Turno da noite (18 da tarde até umas 01h da noite)',
  'Qualquer turno ( estou disponível das 11horas da manhã até as 01 horas da madrugada)',
]

function emptyForm() {
  return {
    email: '',
    contents: [],
    role: '',
    boostingExperience: '',
    otherCommunities: '',
    language: '',
    achievementCanProvide: '',
    achievementTypes: '',
    levelingHours: '',
    levelingSoloOrFriend: '',
    mythicRaiderIo: '',
    mythicHasTeam: '',
    mythicTeamHours: '',
    pvpExperience: '',
    wasOfficerOrRl: '',
    handledTactics: '',
    mainClassSpec: '',
    availability: '',
    commitmentUnderstood: '',
    goldFarmAwareness: '',
    recommendedBy: '',
    ign: '',
    discord: '',
    logsLink: '',
    raidExperience: '',
    uiImageLink: '',
    charactersWillingness: '',
    formAck: '',
  }
}

function apiUrl(path) {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

function Section({ title, children }) {
  return (
    <section className="wx-recruit-section">
      <h2 className="wx-recruit-section-title">{title}</h2>
      <div className="wx-recruit-section-body">{children}</div>
    </section>
  )
}

export function RecruitForm() {
  const [form, setForm] = useState(emptyForm)
  const [availabilityOther, setAvailabilityOther] = useState('')
  const [useAvailabilityOther, setUseAvailabilityOther] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  const showAchievements = form.contents.includes('Achievements')
  const showLeveling = form.contents.includes('Leveling')
  const showMythic = form.contents.includes('Mythic Plus')
  const showPvp = form.contents.includes('PVP')

  const canSubmit = useMemo(() => {
    if (submitting) return false
    return (
      form.email.trim() &&
      form.contents.length > 0 &&
      form.role &&
      form.wasOfficerOrRl &&
      form.handledTactics &&
      form.mainClassSpec.trim() &&
      (useAvailabilityOther ? availabilityOther.trim() : form.availability) &&
      form.commitmentUnderstood.trim() &&
      form.goldFarmAwareness &&
      form.ign.trim() &&
      form.discord.trim() &&
      form.logsLink.trim() &&
      form.raidExperience.trim() &&
      form.uiImageLink.trim() &&
      form.charactersWillingness &&
      form.formAck === 'OK'
    )
  }, [form, availabilityOther, useAvailabilityOther, submitting])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleContent = (content) => {
    setForm((prev) => {
      const exists = prev.contents.includes(content)
      return {
        ...prev,
        contents: exists
          ? prev.contents.filter((item) => item !== content)
          : [...prev.contents, content],
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    const availability = useAvailabilityOther
      ? availabilityOther.trim()
      : form.availability

    const payload = {
      ...form,
      email: form.email.trim(),
      availability,
      boostingExperience: form.boostingExperience.trim(),
      otherCommunities: form.otherCommunities.trim(),
      achievementCanProvide: showAchievements ? form.achievementCanProvide.trim() : '',
      achievementTypes: showAchievements ? form.achievementTypes.trim() : '',
      levelingHours: showLeveling ? form.levelingHours.trim() : '',
      levelingSoloOrFriend: showLeveling ? form.levelingSoloOrFriend.trim() : '',
      mythicRaiderIo: showMythic ? form.mythicRaiderIo.trim() : '',
      mythicHasTeam: showMythic ? form.mythicHasTeam : '',
      mythicTeamHours: showMythic ? form.mythicTeamHours.trim() : '',
      pvpExperience: showPvp ? form.pvpExperience.trim() : '',
      mainClassSpec: form.mainClassSpec.trim(),
      commitmentUnderstood: form.commitmentUnderstood.trim(),
      recommendedBy: form.recommendedBy.trim(),
      ign: form.ign.trim(),
      discord: form.discord.trim(),
      logsLink: form.logsLink.trim(),
      raidExperience: form.raidExperience.trim(),
      uiImageLink: form.uiImageLink.trim(),
    }

    setSubmitting(true)
    setStatus(null)
    try {
      const res = await fetch(apiUrl('/api/recruit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail =
          data?.errors?.[0]?.detail ||
          data?.message ||
          data?.error ||
          `Request failed (${res.status})`
        throw new Error(detail)
      }
      setStatus({ type: 'ok', text: 'Apply enviado. Aguarde contato do staff no Discord.' })
      setForm(emptyForm())
      setAvailabilityOther('')
      setUseAvailabilityOther(false)
    } catch (error) {
      setStatus({
        type: 'err',
        text: error instanceof Error ? error.message : 'Não foi possível enviar o apply.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="wx-recruit">
      <header className="wx-recruit-hero">
        <p className="wx-recruit-kicker">Boosting guild</p>
        <h1 className="wx-recruit-headline">Recruiting</h1>
        <p className="wx-recruit-lead">
          Estamos recrutando jogadores dedicados para raids, Mythic+, PVP, leveling e
          achievements. Preencha com honestidade — o staff lê tudo.
        </p>
        <ul className="wx-recruit-bullets">
          <li>Foco em runs consistentes, com segurança e discrição.</li>
          <li>Recrutamento atual: turno da noite (18h até ~01h).</li>
          <li>Após o envio, aguarde contato no Discord.</li>
        </ul>
      </header>

      {status ? (
        <div
          className={`wx-recruit-status ${status.type === 'ok' ? 'is-ok' : 'is-err'}`}
          role="status"
        >
          {status.text}
        </div>
      ) : null}

      <form className="wx-recruit-form" onSubmit={handleSubmit} noValidate>
        <Section title="Contato">
          <label className="wx-recruit-label" htmlFor="email">
            Email *
          </label>
          <input
            id="email"
            type="email"
            className="wx-recruit-input"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
            autoComplete="email"
          />
        </Section>

        <Section title="Conteúdo & role">
          <p className="wx-recruit-label">
            Qual conteúdo você faz / quer boostar? (pode marcar mais de um) *
          </p>
          <div className="wx-recruit-chips">
            {CONTENT_OPTIONS.map((option) => {
              const active = form.contents.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  className={`wx-recruit-chip ${active ? 'is-active' : ''}`}
                  onClick={() => toggleContent(option)}
                >
                  {option}
                </button>
              )
            })}
          </div>

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">Qual a sua role atual? *</legend>
            <div className="wx-recruit-radios">
              {ROLE_OPTIONS.map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="role"
                    value={option}
                    checked={form.role === option}
                    onChange={() => updateField('role', option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Experiência">
          <label className="wx-recruit-label" htmlFor="boostingExperience">
            Você já boostou alguma vez?
          </label>
          <textarea
            id="boostingExperience"
            className="wx-recruit-input wx-recruit-textarea"
            value={form.boostingExperience}
            onChange={(e) => updateField('boostingExperience', e.target.value)}
          />

          <label className="wx-recruit-label" htmlFor="otherCommunities">
            Outras comunidades / runs que já fez
          </label>
          <textarea
            id="otherCommunities"
            className="wx-recruit-input wx-recruit-textarea"
            value={form.otherCommunities}
            onChange={(e) => updateField('otherCommunities', e.target.value)}
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              ¿Eres hispanohablante? Hablas inglés o portugués?
            </legend>
            <div className="wx-recruit-radios wx-recruit-radios-stack">
              {LANGUAGE_OPTIONS.map((option) => (
                <label key={option.value} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="language"
                    value={option.value}
                    checked={form.language === option.value}
                    onChange={() => updateField('language', option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        {showAchievements ? (
          <Section title="Achievements">
            <label className="wx-recruit-label" htmlFor="achievementCanProvide">
              (Achievement) Consegue fornecer achievements / miscellaneous?
            </label>
            <textarea
              id="achievementCanProvide"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.achievementCanProvide}
              onChange={(e) => updateField('achievementCanProvide', e.target.value)}
            />
            <label className="wx-recruit-label" htmlFor="achievementTypes">
              (Achievement) Quais tipos (glorys, mounts, etc)?
            </label>
            <textarea
              id="achievementTypes"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.achievementTypes}
              onChange={(e) => updateField('achievementTypes', e.target.value)}
            />
          </Section>
        ) : null}

        {showLeveling ? (
          <Section title="Leveling">
            <label className="wx-recruit-label" htmlFor="levelingHours">
              (Leveling) Horas diárias e dias
            </label>
            <textarea
              id="levelingHours"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.levelingHours}
              onChange={(e) => updateField('levelingHours', e.target.value)}
            />
            <label className="wx-recruit-label" htmlFor="levelingSoloOrFriend">
              (Leveling) Solo ou com amigo?
            </label>
            <textarea
              id="levelingSoloOrFriend"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.levelingSoloOrFriend}
              onChange={(e) => updateField('levelingSoloOrFriend', e.target.value)}
            />
          </Section>
        ) : null}

        {showMythic ? (
          <Section title="Mythic+">
            <label className="wx-recruit-label" htmlFor="mythicRaiderIo">
              (Mythic+) Já boostou key? Link raider.io
            </label>
            <input
              id="mythicRaiderIo"
              className="wx-recruit-input"
              value={form.mythicRaiderIo}
              onChange={(e) => updateField('mythicRaiderIo', e.target.value)}
            />
            <fieldset className="wx-recruit-fieldset">
              <legend className="wx-recruit-label">(Mythic+) Tem time de pedra?</legend>
              <div className="wx-recruit-radios">
                {['Sim', 'Não'].map((option) => (
                  <label key={option} className="wx-recruit-radio">
                    <input
                      type="radio"
                      name="mythicHasTeam"
                      value={option}
                      checked={form.mythicHasTeam === option}
                      onChange={() => updateField('mythicHasTeam', option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="wx-recruit-label" htmlFor="mythicTeamHours">
              (Mythic+) Horas / período do time
            </label>
            <textarea
              id="mythicTeamHours"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.mythicTeamHours}
              onChange={(e) => updateField('mythicTeamHours', e.target.value)}
            />
          </Section>
        ) : null}

        {showPvp ? (
          <Section title="PVP">
            <label className="wx-recruit-label" htmlFor="pvpExperience">
              (PVP) Experiência vendendo boost
            </label>
            <textarea
              id="pvpExperience"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.pvpExperience}
              onChange={(e) => updateField('pvpExperience', e.target.value)}
            />
          </Section>
        ) : null}

        <Section title="Liderança">
          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">Já foi Officer ou Raid Leader? *</legend>
            <div className="wx-recruit-radios wx-recruit-radios-stack">
              {OFFICER_OPTIONS.map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="wasOfficerOrRl"
                    value={option}
                    checked={form.wasOfficerOrRl === option}
                    onChange={() => updateField('wasOfficerOrRl', option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Lidava com táticas, splits, comps, etc? *
            </legend>
            <div className="wx-recruit-radios">
              {TACTICS_OPTIONS.map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="handledTactics"
                    value={option}
                    checked={form.handledTactics === option}
                    onChange={() => updateField('handledTactics', option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Personagem & horário">
          <label className="wx-recruit-label" htmlFor="mainClassSpec">
            Main classe/spec e alts com log 90+ no heroico *
          </label>
          <textarea
            id="mainClassSpec"
            className="wx-recruit-input wx-recruit-textarea wx-recruit-textarea-lg"
            value={form.mainClassSpec}
            onChange={(e) => updateField('mainClassSpec', e.target.value)}
            required
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Disponibilidade (recrutando turno da noite) *
            </legend>
            <div className="wx-recruit-radios wx-recruit-radios-stack">
              {AVAILABILITY_OPTIONS.map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="availability"
                    checked={!useAvailabilityOther && form.availability === option}
                    onChange={() => {
                      setUseAvailabilityOther(false)
                      updateField('availability', option)
                    }}
                  />
                  {option}
                </label>
              ))}
              <label className="wx-recruit-radio">
                <input
                  type="radio"
                  name="availability"
                  checked={useAvailabilityOther}
                  onChange={() => {
                    setUseAvailabilityOther(true)
                    updateField('availability', '')
                  }}
                />
                Other
              </label>
            </div>
            {useAvailabilityOther ? (
              <input
                className="wx-recruit-input"
                placeholder="Descreva sua disponibilidade"
                value={availabilityOther}
                onChange={(e) => setAvailabilityOther(e.target.value)}
              />
            ) : null}
          </fieldset>
        </Section>

        <Section title="Compromisso">
          <label className="wx-recruit-label" htmlFor="commitmentUnderstood">
            Entendeu que isso é ambiente de trabalho? *
          </label>
          <textarea
            id="commitmentUnderstood"
            className="wx-recruit-input wx-recruit-textarea"
            value={form.commitmentUnderstood}
            onChange={(e) => updateField('commitmentUnderstood', e.target.value)}
            required
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Ciência de que o foco é farmar gold IRL? *
            </legend>
            <div className="wx-recruit-radios">
              {['Tenho', 'Não Tenho'].map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="goldFarmAwareness"
                    value={option}
                    checked={form.goldFarmAwareness === option}
                    onChange={() => updateField('goldFarmAwareness', option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="wx-recruit-label" htmlFor="recommendedBy">
            Alguém te recomendou? Nome/Discord
          </label>
          <input
            id="recommendedBy"
            className="wx-recruit-input"
            value={form.recommendedBy}
            onChange={(e) => updateField('recommendedBy', e.target.value)}
          />
        </Section>

        <Section title="Identidade & proofs">
          <label className="wx-recruit-label" htmlFor="ign">
            Nome / como é conhecido no jogo *
          </label>
          <input
            id="ign"
            className="wx-recruit-input"
            value={form.ign}
            onChange={(e) => updateField('ign', e.target.value)}
            required
          />

          <label className="wx-recruit-label" htmlFor="discord">
            Discord para contato *
          </label>
          <input
            id="discord"
            className="wx-recruit-input"
            value={form.discord}
            onChange={(e) => updateField('discord', e.target.value)}
            placeholder="user"
            required
          />

          <label className="wx-recruit-label" htmlFor="logsLink">
            Link Imgur / Warcraft Logs (tiers recentes) *
          </label>
          <input
            id="logsLink"
            className="wx-recruit-input"
            value={form.logsLink}
            onChange={(e) => updateField('logsLink', e.target.value)}
            required
          />

          <label className="wx-recruit-label" htmlFor="raidExperience">
            Guilds recentes, prog mítica, CEs *
          </label>
          <textarea
            id="raidExperience"
            className="wx-recruit-input wx-recruit-textarea wx-recruit-textarea-lg"
            value={form.raidExperience}
            onChange={(e) => updateField('raidExperience', e.target.value)}
            required
          />

          <label className="wx-recruit-label" htmlFor="uiImageLink">
            Link da UI em boss fight *
          </label>
          <input
            id="uiImageLink"
            className="wx-recruit-input"
            value={form.uiImageLink}
            onChange={(e) => updateField('uiImageLink', e.target.value)}
            required
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Disposto a manter chars equipados e melhorar gameplay? *
            </legend>
            <div className="wx-recruit-radios">
              {['Entendi', 'Não entendi'].map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="charactersWillingness"
                    value={option}
                    checked={form.charactersWillingness === option}
                    onChange={() => updateField('charactersWillingness', option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Após enviar, espere o staff. Sem contato, considere negado. *
            </legend>
            <label className="wx-recruit-radio">
              <input
                type="radio"
                name="formAck"
                value="OK"
                checked={form.formAck === 'OK'}
                onChange={() => updateField('formAck', 'OK')}
              />
              OK
            </label>
          </fieldset>
        </Section>

        <div className="wx-recruit-actions">
          <button type="submit" className="wx-recruit-submit" disabled={!canSubmit}>
            {submitting ? 'Enviando…' : 'Enviar apply'}
          </button>
          <p className="wx-recruit-footnote">
            As respostas vão direto para o staff no Discord. Nada é salvo neste site.
          </p>
        </div>
      </form>
    </div>
  )
}
