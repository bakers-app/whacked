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

const LANGUAGE_OPTIONS = ['si soy', 'portugues', 'ingles', 'No soy']

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

const GOLD_FARM_OPTIONS = ['Tenho', 'Não Tenho']

function emptyForm() {
  return {
    contents: [],
    role: '',
    boostingExperience: '',
    otherCommunities: '',
    language: [],
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

function FieldLabel({ htmlFor, required, children, hint }) {
  const Tag = htmlFor ? 'label' : 'p'
  const props = htmlFor ? { htmlFor, className: 'wx-recruit-label' } : { className: 'wx-recruit-label' }
  return (
    <div className="wx-recruit-field-head">
      <Tag {...props}>
        {children}
        {required ? ' *' : null}
      </Tag>
      {hint ? <p className="wx-recruit-hint">{hint}</p> : null}
    </div>
  )
}

export function RecruitForm() {
  const [form, setForm] = useState(emptyForm)
  const [availabilityOther, setAvailabilityOther] = useState('')
  const [useAvailabilityOther, setUseAvailabilityOther] = useState(false)
  const [goldFarmOther, setGoldFarmOther] = useState('')
  const [useGoldFarmOther, setUseGoldFarmOther] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  const showAchievements = form.contents.includes('Achievements')
  const showLeveling = form.contents.includes('Leveling')
  const showMythic = form.contents.includes('Mythic Plus')
  const showPvp = form.contents.includes('PVP')

  const resolvedAvailability = useAvailabilityOther
    ? availabilityOther.trim()
    : form.availability
  const resolvedGoldFarm = useGoldFarmOther
    ? goldFarmOther.trim()
    : form.goldFarmAwareness

  const canSubmit = useMemo(() => {
    if (submitting) return false
    return (
      form.contents.length > 0 &&
      form.role &&
      form.wasOfficerOrRl &&
      form.handledTactics &&
      form.mainClassSpec.trim() &&
      resolvedAvailability &&
      form.commitmentUnderstood.trim() &&
      resolvedGoldFarm &&
      form.ign.trim() &&
      form.discord.trim() &&
      form.logsLink.trim() &&
      form.raidExperience.trim() &&
      form.uiImageLink.trim() &&
      form.charactersWillingness &&
      form.formAck === 'OK'
    )
  }, [
    form,
    resolvedAvailability,
    resolvedGoldFarm,
    submitting,
  ])

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

  const toggleLanguage = (option) => {
    setForm((prev) => {
      const exists = prev.language.includes(option)
      return {
        ...prev,
        language: exists
          ? prev.language.filter((item) => item !== option)
          : [...prev.language, option],
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    const payload = {
      ...form,
      availability: resolvedAvailability,
      goldFarmAwareness: resolvedGoldFarm,
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
      setGoldFarmOther('')
      setUseGoldFarmOther(false)
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
        <p className="wx-recruit-kicker">The Bakers Boosting Guild</p>
        <h1 className="wx-recruit-headline">Recruiting</h1>
        <p className="wx-recruit-tagline">O maior time do US de boosting recruta!</p>

        <p className="wx-recruit-lead">
          Estamos em busca de jogadores dedicados e de alto desempenho para completar o
          conteúdo das Raids, Mythic plus, PVP, Leveling e Achievements — com
          remuneração em gold ou lulas durante o processo.
        </p>
        <p className="wx-recruit-emphasis">Você escolhe.</p>

        <dl className="wx-recruit-highlights">
          <div className="wx-recruit-hl">
            <dt>Remuneração</dt>
            <dd>
              Boosters tiram de <strong>2 a 7 mil por mês</strong>, conforme o desempenho do
              time e quantas runs você faz. Tem gente literalmente vivendo disso há anos.
            </dd>
          </div>
          <div className="wx-recruit-hl">
            <dt>Operação</dt>
            <dd>
              Seis times ativos, em três turnos — runs das <strong>10h às 02h</strong> todos
              os dias. Sessões de Raid somam de 6 a 10 horas por dia cada time.
            </dd>
          </div>
          <div className="wx-recruit-hl wx-recruit-hl--accent">
            <dt>Recrutamento atual</dt>
            <dd>
              Horário: <strong>10h às 02h</strong>.
            </dd>
          </div>
        </dl>

        <div className="wx-recruit-blocks">
          <section className="wx-recruit-block">
            <h2 className="wx-recruit-block-title">Progressão &amp; agenda</h2>
            <p>
              Após a conclusão da progressão e aquisição do equipamento necessário, passamos
              a focar em runs heroicas recorrentes — e, se o time quiser, mítico.
            </p>
            <p>
              Não realizamos Raids em feriados importantes e sempre dialogamos sobre folgas e
              ajustes de agenda. Em períodos de baixa atividade, os horários são flexíveis e
              as decisões são colaborativas, visando o bem-estar de ambas as partes.
            </p>
            <p>
              Interessado em Mythic plus, PVP, leveling ou achievements? Estamos recrutando
              para todos os conteúdos.
            </p>
          </section>

          <section className="wx-recruit-block">
            <h2 className="wx-recruit-block-title">Informações sobre a guild</h2>
            <ul className="wx-recruit-facts">
              <li>
                <strong>Segurança</strong>
                <span>
                  Foco em gold da vida real, com total segurança e discrição. Mais de 3 anos
                  sem incidente de banimento pelo boosting em si.
                </span>
              </li>
              <li>
                <strong>Pontualidade</strong>
                <span>
                  Convites 15 minutos antes da Raid. Imprevisto? Avise com antecedência.
                  Ambiente descontraído, mas tratamos como trabalho.
                </span>
              </li>
              <li>
                <strong>Performance</strong>
                <span>
                  Cada time tem preparação de addons e estratégias. Esperamos o máximo que
                  seu personagem pode oferecer.
                </span>
              </li>
              <li>
                <strong>Suporte</strong>
                <span>
                  Você não será removido sem aviso. Oferecemos orientação até a performance
                  atender às expectativas.
                </span>
              </li>
              <li>
                <strong>Discrição</strong>
                <span>
                  A guilda não usa o nome &quot;The Bakers&quot; in-game — para preservar a
                  identidade de todos.
                </span>
              </li>
              <li>
                <strong>Alts</strong>
                <span>
                  Requerimos vários bonecos equipados ao longo da season. A quantidade é
                  definida em conjunto pelo time — não de forma unilateral.
                </span>
              </li>
              <li>
                <strong>Raid Leader</strong>
                <span>
                  O RL define o norte do time e é a maior autoridade dentro da raid. Se você
                  não consegue seguir ordens, vai ser um problema.
                </span>
              </li>
              <li>
                <strong>Ambiente de trabalho</strong>
                <span>
                  Considere este formulário a sua entrega de currículo. Todas as mensagens
                  são lidas pelo staff, com total confidencialidade.
                </span>
              </li>
              <li>
                <strong>Requisito</strong>
                <span>
                  Se você não tem pelo menos alguns logs laranjas no heroico, isso aqui não é
                  pra você.
                </span>
              </li>
              <li>
                <strong>Perguntas específicas</strong>
                <span>
                  Algumas perguntas abaixo são para públicos específicos (Mythic+, Leveling,
                  PVP). Se não se enquadra, pode skipar sem prejuízo.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </header>

      {status ? (
        <div
          className="wx-recruit-modal-backdrop"
          role="presentation"
          onClick={() => setStatus(null)}
        >
          <div
            className={`wx-recruit-modal ${status.type === 'ok' ? 'is-ok' : 'is-err'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruit-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="recruit-modal-title" className="wx-recruit-modal-text">
              {status.text}
            </p>
            <button
              type="button"
              className="wx-recruit-modal-close"
              onClick={() => setStatus(null)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      <form className="wx-recruit-form" onSubmit={handleSubmit} noValidate>
        <Section title="Conteúdo & role">
          <FieldLabel
            required
            hint="Pode escolher mais de um caso faça orders de vários tipos."
          >
            Qual conteúdo PVE ou PVP você faz atualmente? Liste todos os que você tem
            capacidade/quer boostar com a gente.
          </FieldLabel>
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
            <legend className="wx-recruit-label">Qual a sua role atual *</legend>
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
          <FieldLabel
            htmlFor="boostingExperience"
            hint="Nós conte se sim, se não apenas diga que não."
          >
            Você já é experiente no mundo do boosting? Já boostou alguma vez?
          </FieldLabel>
          <textarea
            id="boostingExperience"
            className="wx-recruit-input wx-recruit-textarea"
            value={form.boostingExperience}
            onChange={(e) => updateField('boostingExperience', e.target.value)}
          />

          <FieldLabel htmlFor="otherCommunities">
            Você está em alguma outra comunidade ou já fez runs em alguma delas? Se sim,
            liste elas e o que você fez de run para eles
          </FieldLabel>
          <textarea
            id="otherCommunities"
            className="wx-recruit-input wx-recruit-textarea"
            value={form.otherCommunities}
            onChange={(e) => updateField('otherCommunities', e.target.value)}
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Es espano hablante? Hablas ingles or portugues?
            </legend>
            <div className="wx-recruit-chips">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = form.language.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    className={`wx-recruit-chip ${active ? 'is-active' : ''}`}
                    onClick={() => toggleLanguage(option)}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </Section>

        {showAchievements ? (
          <Section title="Achievements">
            <FieldLabel htmlFor="achievementCanProvide">
              (Achievement) Você consegue fornecer qualquer tipo de achievement ou conteúdo
              miscelanous como campanha, farm de renome, loremaster e etc?
            </FieldLabel>
            <textarea
              id="achievementCanProvide"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.achievementCanProvide}
              onChange={(e) => updateField('achievementCanProvide', e.target.value)}
            />
            <FieldLabel htmlFor="achievementTypes">
              (Achievement) Me explique quais tipos de conteúdo você faz enquanto booster de
              achiev (glorys, farm de mount e etc, liste tudo precisamente)
            </FieldLabel>
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
            <FieldLabel htmlFor="levelingHours">
              (Leveling) Você trabalha durante quantas horas diárias, upando? E em quais dias
              também
            </FieldLabel>
            <textarea
              id="levelingHours"
              className="wx-recruit-input wx-recruit-textarea"
              value={form.levelingHours}
              onChange={(e) => updateField('levelingHours', e.target.value)}
            />
            <FieldLabel htmlFor="levelingSoloOrFriend">
              (Leveling) Você tem algum outro amigo no qual faz junto com você o leveling? ou
              você faz solo
            </FieldLabel>
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
            <FieldLabel htmlFor="mythicRaiderIo">
              (Mythic+) Você já boostou key? Se sim linke seu raider.io
            </FieldLabel>
            <input
              id="mythicRaiderIo"
              className="wx-recruit-input"
              value={form.mythicRaiderIo}
              onChange={(e) => updateField('mythicRaiderIo', e.target.value)}
            />
            <fieldset className="wx-recruit-fieldset">
              <legend className="wx-recruit-label">
                (Mythic+) Você tem um time de pedra no qual fazem boosts?
              </legend>
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
            <FieldLabel htmlFor="mythicTeamHours">
              (Mythic+) Caso tenha um time de keys, quantas horas costumavam trabalhar? e em
              qual período, me conta um pouco
            </FieldLabel>
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
            <FieldLabel htmlFor="pvpExperience">
              (PVP) Me diga sobre você e sua experiência vendendo boost de PVP
            </FieldLabel>
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
            <legend className="wx-recruit-label">
              Você já foi Officer ou Raid leader de alguma guild? *
            </legend>
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
              Se você já foi Officer ou Raid Leader, você lidava com a organização de
              táticas, splits, comps e etc? *
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
          <FieldLabel
            htmlFor="mainClassSpec"
            required
            hint="Liste somente coisas que consegue perfomar com log 90+ no heroico, menos que isso não interessa pra gente."
          >
            Qual sua Main Classe e Spec? Descreva tudo que você joga, e já jogou
            decentemente; se jogar com alt, descreva quais tem uma boa capacidade e/ou já
            jogou.
          </FieldLabel>
          <textarea
            id="mainClassSpec"
            className="wx-recruit-input wx-recruit-textarea wx-recruit-textarea-lg"
            value={form.mainClassSpec}
            onChange={(e) => updateField('mainClassSpec', e.target.value)}
            required
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Você tem disponibilidade quais horários de raid? *
            </legend>
            <p className="wx-recruit-hint">
              Cada turno vai de 6 a 10 horas diárias, com o início podendo variar 1h mais
              cedo ou mais tarde a depender da situação atual do patch. Recrutamos para o
              turno da noite no momento: 18 até no máximo 01 horas da manhã.
            </p>
            <p className="wx-recruit-hint">
              Exemplo: Tarde seria 12h até umas 20h · Noite seria 18h até umas 01h.
            </p>
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
          <FieldLabel htmlFor="commitmentUnderstood" required>
            Você entendeu que isso aqui é um ambiente de trabalho que requer seu esforço e
            atenção enquanto joga? Se você levar isso aqui com falta de compromisso ou igual
            você leva um core, você não vai durar um mês aqui
          </FieldLabel>
          <textarea
            id="commitmentUnderstood"
            className="wx-recruit-input wx-recruit-textarea"
            value={form.commitmentUnderstood}
            onChange={(e) => updateField('commitmentUnderstood', e.target.value)}
            required
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Você tem ciência que essa não é sua guild convencional que faz prog e busca
              equipar seu boneco para dar mais dano, nosso objetivo é farmar o máximo de gold
              irl possível dentro do tempo de raid setado para o grupo, ninguém aqui liga pro
              seu ilvl pro seu details e por ai vai, nosso foco é exclusivamente na conclusão
              da raid e obter a maior quantidade de gold possível enquanto isso *
            </legend>
            <div className="wx-recruit-radios wx-recruit-radios-stack">
              {GOLD_FARM_OPTIONS.map((option) => (
                <label key={option} className="wx-recruit-radio">
                  <input
                    type="radio"
                    name="goldFarmAwareness"
                    value={option}
                    checked={!useGoldFarmOther && form.goldFarmAwareness === option}
                    onChange={() => {
                      setUseGoldFarmOther(false)
                      updateField('goldFarmAwareness', option)
                    }}
                  />
                  {option}
                </label>
              ))}
              <label className="wx-recruit-radio">
                <input
                  type="radio"
                  name="goldFarmAwareness"
                  checked={useGoldFarmOther}
                  onChange={() => {
                    setUseGoldFarmOther(true)
                    updateField('goldFarmAwareness', '')
                  }}
                />
                Other
              </label>
            </div>
            {useGoldFarmOther ? (
              <input
                className="wx-recruit-input"
                placeholder="Sua resposta"
                value={goldFarmOther}
                onChange={(e) => setGoldFarmOther(e.target.value)}
              />
            ) : null}
          </fieldset>

          <FieldLabel htmlFor="recommendedBy">
            Alguém te recomendou pra cá? Se sim, diga o nome/disc dele
          </FieldLabel>
          <input
            id="recommendedBy"
            className="wx-recruit-input"
            value={form.recommendedBy}
            onChange={(e) => updateField('recommendedBy', e.target.value)}
          />
        </Section>

        <Section title="Identidade & proofs">
          <FieldLabel htmlFor="ign" required>
            Seu nome/como é conhecido no jogo
          </FieldLabel>
          <input
            id="ign"
            className="wx-recruit-input"
            value={form.ign}
            onChange={(e) => updateField('ign', e.target.value)}
            required
          />

          <FieldLabel
            htmlFor="discord"
            required
            hint="Se você não por seu discord não conseguirei entrar em contato."
          >
            Discord para contato
          </FieldLabel>
          <input
            id="discord"
            className="wx-recruit-input"
            value={form.discord}
            onChange={(e) => updateField('discord', e.target.value)}
            placeholder="user"
            required
          />

          <FieldLabel
            htmlFor="logsLink"
            required
            hint="NÃO MANDE LOG DE DG. Seu raider.io não é o ideal — mande apenas se não tiver nenhuma outra opção. Wclogs funciona também se seus logs estiverem abertos."
          >
            Link no imgur (imgur.com) seus logs de tiers recentes, se possível acrescente
            imagens de mais de um tier.
          </FieldLabel>
          <input
            id="logsLink"
            className="wx-recruit-input"
            value={form.logsLink}
            onChange={(e) => updateField('logsLink', e.target.value)}
            required
          />

          <FieldLabel
            htmlFor="raidExperience"
            required
            hint="Se você pegou CE lá no Legion, não ajuda sua situação agora — gostaríamos de saber conquistas recentes."
          >
            Liste abaixo onde você já raidou em guilds recentes, se você tem prog mítica
            recente se já pegou alguns CE, nós conte sobre sua experiência de raid até hoje.
          </FieldLabel>
          <textarea
            id="raidExperience"
            className="wx-recruit-input wx-recruit-textarea wx-recruit-textarea-lg"
            value={form.raidExperience}
            onChange={(e) => updateField('raidExperience', e.target.value)}
            required
          />

          <FieldLabel htmlFor="uiImageLink" required>
            Uma imagem da sua UI atual durante uma boss fight upada em qualquer site que
            faça isso tipo o Imgur
          </FieldLabel>
          <input
            id="uiImageLink"
            className="wx-recruit-input"
            value={form.uiImageLink}
            onChange={(e) => updateField('uiImageLink', e.target.value)}
            required
          />

          <fieldset className="wx-recruit-fieldset">
            <legend className="wx-recruit-label">
              Você não precisa ser o melhor nem maior player do mundo, mas você precisa
              estar disposto a ter personagens equipados, jogar minimamente bem com eles e
              estar disposto a equipar e melhorar a gameplay com eles, você compreendeu isso
              que está sendo pedido? *
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
              Após responder todo o formulário, espere a resposta de um de nossos staff —
              mais informações serão respondidas no ticket. *
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
