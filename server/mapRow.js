/**
 * Mapeia uma linha da tabela `services` para o formato do front.
 * Aceita nomes de colunas comuns; ajuste via variáveis de ambiente se precisar.
 */

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return row[k]
  }
  return ''
}

function formatPrice(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'bigint')
    return `${Number(value).toLocaleString('en-US')} gold`
  if (typeof value === 'number')
    return `${value.toLocaleString('en-US')} gold`
  const s = String(value).trim()
  if (/gold/i.test(s)) return s
  const n = Number(String(s).replace(/,/g, ''))
  if (!Number.isNaN(n)) return `${n.toLocaleString('en-US')} gold`
  return s
}

export function mapServiceRow(row, env) {
  const fkCol = env.SERVICE_CATEGORY_FK_COLUMN || 'id_service_category'
  const nameKey = env.SERVICE_NAME_COLUMN
  const detailsKey = env.SERVICE_DETAILS_COLUMN
  const priceKey = env.SERVICE_PRICE_COLUMN
  const categoryKey = env.SERVICE_CATEGORY_COLUMN

  const idServiceCategory =
    row[fkCol] != null ? row[fkCol] : row.id_service_category

  const name = nameKey
    ? pick(row, [nameKey])
    : pick(row, ['name', 'title', 'service_name', 'label', 'product_name'])

  const details = detailsKey
    ? pick(row, [detailsKey])
    : pick(row, [
        'details',
        'description',
        'loot',
        'loot_type',
        'subtitle',
        'info',
      ])

  const priceRaw = priceKey ? row[priceKey] : pick(row, ['price', 'gold', 'amount', 'cost'])

  const category = categoryKey
    ? pick(row, [categoryKey])
    : pick(row, [
        'service_category_title',
        'category_name',
        'category',
        'section',
        'group_name',
        'catalog_section',
      ])

  const categoryDisplay =
    String(category || '').trim() ||
    (idServiceCategory != null
      ? `Category ${idServiceCategory}`
      : 'General')

  return {
    id: row.id ?? row.uuid ?? null,
    idServiceCategory:
      idServiceCategory != null ? idServiceCategory : null,
    name: String(name || 'Untitled'),
    details: String(details || '—'),
    price: formatPrice(priceRaw) || '—',
    category: categoryDisplay,
  }
}
