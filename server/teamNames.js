/**
 * Discord team id → nome legível na agenda (runs).
 * Atualize aqui quando surgirem times novos.
 */
export const TEAM_ID_TO_LABEL = Object.freeze({
  '1483173945787154492': 'Achievements',
  '1354858326327820293': 'Advertiser',
  '1481294348678074410': 'Advertiser Junior',
  '1354858326327820296': 'Apae',
  '1409724091564556421': 'Bastard',
  '1354858326361641087': 'Chefe',
  '1354858326361641081': 'Confeiteiros',
  '1362469036532957367': 'Dtm',
  '1354858326327820292': 'Freelancer',
  '1412281399393648710': 'Gachi Squad',
  '1354858326361641082': 'Garçom',
  '1372743650752335933': 'Greensky',
  '1375932937714925740': 'Guild Azralon 11',
  '1374515998748577924': 'Guild Azralon 2',
  '1369531629097189479': 'Insanos',
  '1354858326361641080': 'Jack Fruit',
  '1369397332747092018': 'Kffc',
  '1395548109391794207': 'Leveling',
  '1354858326327820295': 'Los Renegados',
  '1354858326327820297': 'Milharal',
  '1395467045558161549': 'Mplus Solo',
  '1397277146120192171': 'Mplus Team',
  '1354858326361641083': 'Padeirinho',
  '1354858326361641086': 'Prefeito',
  '1398305215270359090': 'Punks',
  '1483572061938122803': 'PvP',
  '1376977592590008382': 'Rocket',
  '1354858326361641084': 'Staff',
})

/**
 * @param {unknown} raw — id do Discord, texto do time, etc.
 * @returns {string} nome conhecido ou o valor original em string
 */
export function resolveTeamLabel(raw) {
  if (raw == null) return ''
  const key = String(raw).trim()
  if (!key) return ''
  return TEAM_ID_TO_LABEL[key] ?? key
}
