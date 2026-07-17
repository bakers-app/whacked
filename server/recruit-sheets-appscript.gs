/**
 * Google Apps Script para a planilha PLAYERS RECRUIT.
 *
 * Setup (importante — senão dá 403 HTML):
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Cole este arquivo → Salvar
 * 3. Implantar → Nova implantação → Tipo: App da Web
 *    - Descrição: recruit
 *    - Executar como: Eu (sua conta Google)
 *    - Quem tem acesso: Qualquer pessoa  ← NÃO use "Conta do Google"
 * 4. Autorize o acesso à planilha quando o Google pedir
 * 5. Copie a URL que termina em /exec para RECRUIT_SHEETS_WEBHOOK_URL
 *
 * Se editar o script depois: Implantar → Gerenciar implantações → ✏️ →
 * Nova versão → Implantar (e confirme a URL no .env).
 */

const SECRET = '' // opcional — mesma string do .env RECRUIT_SHEETS_SECRET

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}'
    const data = JSON.parse(raw)

    if (SECRET && data.secret !== SECRET) {
      return json_({ ok: false, error: 'unauthorized' })
    }

    const values = data.values
    if (!Array.isArray(values) || !values.length) {
      return json_({ ok: false, error: 'missing_values' })
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
    ensureHeaders_(sheet, data.headers)
    sheet.appendRow(values)

    return json_({ ok: true })
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

function doGet() {
  return json_({ ok: true, service: 'recruit-sheets' })
}

function ensureHeaders_(sheet, headers) {
  if (!Array.isArray(headers) || !headers.length) return
  const lastCol = sheet.getLastColumn()
  if (lastCol === 0 || !String(sheet.getRange(1, 1).getValue() || '').trim()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
