/**
 * Formateo de importes del portal — punto único.
 *
 * POR QUÉ NO HAY FALLBACK A EUR
 * -----------------------------
 * Hasta ahora cada página tenía su propio `formatAmount` y varias asumían
 * `currency = 'EUR'` (o pegaban el símbolo « € » a mano). Para un cliente que
 * factura en COP eso no es un detalle cosmético: convierte un importe correcto
 * en un dato falso — 1.500 COP mostrado como «1.500 €» es un error de negocio,
 * no de maquetación.
 *
 * Por eso, cuando no sabemos la moneda, formateamos SOLO el número (sin símbolo
 * ni código). Un importe sin símbolo es ambiguo y se nota; un importe con la
 * moneda equivocada parece correcto y engaña. Preferimos lo primero.
 *
 * El símbolo, su posición y los decimales los decide `Intl.NumberFormat` a
 * partir del código ISO: no mantenemos tablas de símbolos a mano (justo lo que
 * provocó el bug).
 */

const LOCALE = 'es-ES'

// ISO 4217 son tres letras. Intl lanza RangeError con cualquier otra cosa
// (cadena vacía, "€", "eur " con espacios…), así que validamos antes.
const ISO_4217 = /^[A-Za-z]{3}$/

const numberFormat = (options) => new Intl.NumberFormat(LOCALE, options)

/** Devuelve el código ISO en mayúsculas, o null si no es un código válido. */
function normalizeCurrency(currency) {
  if (typeof currency !== 'string') return null
  const code = currency.trim().toUpperCase()
  return ISO_4217.test(code) ? code : null
}

/**
 * Primera moneda válida de la lista de candidatos, o null.
 * Uso típico: `resolveCurrency(factura.currency, monedaDelCliente)`.
 */
export function resolveCurrency(...candidates) {
  for (const candidate of candidates) {
    const code = normalizeCurrency(candidate)
    if (code) return code
  }
  return null
}

/**
 * Moneda del cliente autenticado (respaldo cuando un agregado no trae moneda
 * por fila). Se lee del objeto `client` que AuthContext guarda desde /auth/me;
 * este helper no modifica ni asume nada más de ese contexto.
 */
export function clientCurrency(client) {
  return resolveCurrency(client?.currency, client?.billing_preferences?.currency)
}

/**
 * Moneda común de una lista. Si las filas mezclan monedas devuelve
 * `{ currency: null, mixed: true }`: quien llame debe decidir qué hacer con el
 * agregado (nosotros dejamos de mostrar el total, no lo sumamos a ciegas).
 */
export function detectCurrency(items, getCurrency = (item) => item?.currency) {
  const codes = new Set()
  for (const item of items || []) {
    const code = normalizeCurrency(getCurrency(item))
    if (code) codes.add(code)
  }
  if (codes.size === 0) return { currency: null, mixed: false }
  if (codes.size === 1) return { currency: [...codes][0], mixed: false }
  return { currency: null, mixed: true }
}

/**
 * Importe formateado.
 *
 * @param {number|string|null} amount
 * @param {string|null} currency  Código ISO. Si falta o no es válido → solo número.
 * @param {{ decimals?: number, fallback?: string }} [opts]
 *        `decimals` fuerza los decimales (KPIs que quieren cifras redondas);
 *        si se omite, manda la convención de la moneda (2 en EUR, 0 en JPY…).
 */
export function formatMoney(amount, currency, opts = {}) {
  const { decimals, fallback = '—' } = opts
  const n = Number(amount)
  if (amount == null || amount === '' || !Number.isFinite(n)) return fallback

  const code = normalizeCurrency(currency)
  const fixed = Number.isFinite(decimals)
    ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
    : null

  if (!code) {
    // Sin moneda: número a secas, con 2 decimales salvo indicación contraria.
    return numberFormat(fixed ?? { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  }

  return numberFormat({ style: 'currency', currency: code, ...fixed }).format(n)
}

/**
 * Símbolo de la moneda y dónde lo coloca la locale, según el propio Intl.
 * Sirve para componer valores abreviados ("1,5k €") sin inventar símbolos.
 */
function currencyAffix(code) {
  const parts = numberFormat({ style: 'currency', currency: code }).formatToParts(1)
  const index = parts.findIndex((p) => p.type === 'currency')
  if (index === -1) return null
  return {
    symbol: parts[index].value,
    before: index === 0,
    spaced: parts.some((p) => p.type === 'literal' && /\s| /.test(p.value)),
  }
}

/**
 * Número y símbolo por separado, para maquetas que los estilan distinto (la
 * tarjeta de contrato pinta el símbolo más pequeño y apagado). `symbol` es null
 * si no conocemos la moneda: en ese caso se pinta solo la cifra.
 */
export function formatMoneyParts(amount, currency, opts = {}) {
  const { fallback = '—' } = opts
  const value = formatMoney(amount, null, opts)
  const code = normalizeCurrency(currency)
  if (!code || value === fallback) return { value, symbol: null, symbolFirst: false }

  const affix = currencyAffix(code)
  if (!affix) return { value, symbol: code, symbolFirst: false }
  return { value, symbol: affix.symbol, symbolFirst: affix.before }
}

/**
 * Variante compacta para KPIs: a partir de 1.000 abrevia en miles ("1,5k €"),
 * por debajo muestra la cifra redonda. Mantiene el formato que ya usaba el
 * portal, pero con la moneda real en lugar de un « € » fijo.
 */
export function formatMoneyCompact(amount, currency, opts = {}) {
  const { fallback = '—' } = opts
  const n = Number(amount)
  if (amount == null || amount === '' || !Number.isFinite(n)) return fallback

  if (Math.abs(n) < 1000) return formatMoney(n, currency, { decimals: 0, fallback })

  const compact =
    numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1000) + 'k'

  const code = normalizeCurrency(currency)
  if (!code) return compact

  const affix = currencyAffix(code)
  if (!affix) return `${compact} ${code}`

  const gap = affix.spaced ? ' ' : ''
  return affix.before ? `${affix.symbol}${gap}${compact}` : `${compact}${gap}${affix.symbol}`
}
