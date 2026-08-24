import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  Building2,
  Check,
  Copy,
  CreditCard,
  DollarSign,
  Euro,
  ExternalLink,
  Globe,
  Landmark,
  Link2,
  QrCode,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { formatMoney } from '../../utils/money'
import './payment-methods.css'

/* ------------------------------------------------------------------
   Catálogo de métodos de pago del cliente (GET /client/payment-methods).

   Este módulo es el único sitio donde se decide cómo se pinta un método
   de pago. Lo consumen la página `/portal/payment-methods` (catálogo
   completo) y el modal de cobro del detalle de factura, para que ambos
   muestren exactamente lo mismo y un método nuevo del CRM aparezca en
   los dos sin tocar nada.
------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   Iconos: la API manda slugs de Heroicons v2 outline y el portal usa
   lucide-react. No hay 1:1 garantizado, así que se mapea lo conocido y
   todo lo demás cae en DEFAULT_ICON — nunca se rompe por un icono nuevo.
------------------------------------------------------------------ */
const DEFAULT_ICON = Wallet

const ICON_MAP = {
  'credit-card': CreditCard,
  'building-library': Landmark,
  'building-office': Building2,
  'building-office-2': Building2,
  banknotes: Banknote,
  'currency-euro': Euro,
  'currency-dollar': DollarSign,
  'device-phone-mobile': Smartphone,
  'globe-alt': Globe,
  'globe-americas': Globe,
  'qr-code': QrCode,
  link: Link2,
  wallet: Wallet,
}

export function resolveIcon(slug) {
  if (typeof slug !== 'string') return DEFAULT_ICON
  // heroicon-o-credit-card | heroicon-s-wallet | credit-card → credit-card
  const clean = slug.trim().toLowerCase().replace(/^heroicon-[a-z]+-/, '')
  // hasOwnProperty: sin él, un slug como "constructor" o "__proto__" resuelve a
  // Object.prototype y React revienta la página entera al renderarlo como icono.
  return Object.prototype.hasOwnProperty.call(ICON_MAP, clean) ? ICON_MAP[clean] : DEFAULT_ICON
}

/* Etiqueta de tipo. Solo para los tipos que conocemos: un tipo nuevo no
   inventa badge, se queda sin él. */
export const TYPE_META = {
  link: { badge: 'cyan', label: 'Enlace de pago' },
  bank_transfer: { badge: 'blue', label: 'Transferencia' },
}

/* Campos conocidos de config.bank_transfer, en orden de lectura.
   Cualquiera puede venir null o ausente: no se pinta la fila. */
export const BANK_FIELDS = [
  { key: 'bank_name', label: 'Banco' },
  { key: 'account_number', label: 'Número de cuenta' },
  { key: 'account_holder', label: 'Titular' },
  { key: 'account_id_number', label: 'Documento del titular' },
]

export function scalarText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function humanize(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/** Solo http(s): el valor viene de la API, no abrimos javascript: ni data:. */
export function safeUrl(value) {
  const text = scalarText(value)
  if (!text) return null
  try {
    const url = new URL(text)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

/**
 * Filas de datos a partir de `config`. Primero los campos conocidos en su
 * orden, después cualquier escalar extra que la API añada sin release del
 * frontend (con etiqueta humanizada). Objetos y arrays se ignoran.
 */
export function buildRows(config, fields = [], skipKeys = []) {
  const cfg = config && typeof config === 'object' && !Array.isArray(config) ? config : {}
  const used = new Set(skipKeys)
  const rows = []

  fields.forEach(({ key, label }) => {
    used.add(key)
    const value = scalarText(cfg[key])
    if (value) rows.push({ key, label, value })
  })

  Object.keys(cfg).forEach((key) => {
    if (used.has(key)) return
    const value = scalarText(cfg[key])
    if (value) rows.push({ key, label: humanize(key), value })
  })

  return rows
}

/** Identificador estable de un método; si la API no manda `key`, la posición. */
export function methodId(method, index) {
  return scalarText(method?.key) || `method-${index}`
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // sigue al fallback (contexto no seguro o permiso denegado)
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Catálogo de métodos habilitados para el cliente autenticado.
 * El array ya viene filtrado y ordenado por el admin: se pinta tal cual.
 */
export function usePaymentMethods() {
  const { data, loading, error, refetch } = useApi('/client/payment-methods')

  const methods = useMemo(() => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    return []
  }, [data])

  return { methods, loading, error, refetch }
}

/**
 * Estado de «copiado» compartido por la lista. `notify` es opcional: quien
 * llame decide si enseña toast (la página y el modal usan el suyo).
 */
export function useMethodCopy(notify) {
  const [copiedId, setCopiedId] = useState(null)

  const onCopy = useCallback(
    async (id, value, label) => {
      const ok = await copyText(value)
      if (!ok) {
        notify?.('No se pudo copiar')
        return
      }
      setCopiedId(id)
      notify?.(`${label} copiado`)
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600)
    },
    [notify],
  )

  return { copiedId, onCopy }
}

/** Lista de tarjetas. Es lo que pintan tanto la página como el modal. */
export function PaymentMethodList({ methods, copiedId, onCopy }) {
  return (
    <div className="pm-grid">
      {(methods || []).map((method, index) => {
        const id = methodId(method, index)
        return (
          <MethodCard key={id} id={id} method={method} copiedId={copiedId} onCopy={onCopy} />
        )
      })}
    </div>
  )
}

export function MethodCard({ id, method, copiedId, onCopy }) {
  const Icon = resolveIcon(method?.icon)
  const meta = TYPE_META[method?.type]
  const label = scalarText(method?.label) || 'Método de pago'
  const description = scalarText(method?.description)

  return (
    <div className="pm-card">
      <div className="pm-card-head">
        <div className="pm-card-icon">
          <Icon size={18} strokeWidth={1.6} />
        </div>
        <div className="pm-card-heading">
          <div className="pm-card-title">{label}</div>
          {meta && <span className={`pr-badge ${meta.badge}`}>{meta.label}</span>}
        </div>
      </div>

      {description && <p className="pm-card-desc">{description}</p>}

      <MethodBody id={id} method={method} copiedId={copiedId} onCopy={onCopy} />
    </div>
  )
}

/**
 * `type` es un enum abierto: hoy link | bank_transfer. La rama default
 * degrada con dignidad (label + description ya pintados arriba, más los
 * escalares de config) en lugar de romper con un tipo que no conocemos.
 */
export function MethodBody({ id, method, copiedId, onCopy }) {
  const label = scalarText(method?.label) || 'Método de pago'

  switch (method?.type) {
    case 'link': {
      const url = safeUrl(method?.config?.url)
      const extraRows = buildRows(method?.config, [], ['url'])
      return (
        <div className="pm-body">
          {extraRows.length > 0 && (
            <InfoRows rows={extraRows} idPrefix={id} copiedId={copiedId} onCopy={onCopy} />
          )}
          {url ? (
            <a
              className="pr-btn primary sm pm-cta"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={13} /> Pagar con {label}
            </a>
          ) : (
            <p className="pm-note">Enlace de pago no disponible ahora mismo.</p>
          )}
        </div>
      )
    }

    case 'bank_transfer': {
      const rows = buildRows(method?.config, BANK_FIELDS)
      return (
        <div className="pm-body">
          {rows.length > 0 ? (
            <InfoRows rows={rows} idPrefix={id} copiedId={copiedId} onCopy={onCopy} />
          ) : (
            <p className="pm-note">Datos bancarios no disponibles ahora mismo.</p>
          )}
        </div>
      )
    }

    default: {
      const rows = buildRows(method?.config)
      return (
        <div className="pm-body">
          {rows.length > 0 ? (
            <InfoRows rows={rows} idPrefix={id} copiedId={copiedId} onCopy={onCopy} />
          ) : (
            <p className="pm-note">Contacta con el equipo para completar este método.</p>
          )}
        </div>
      )
    }
  }
}

export function InfoRows({ rows, idPrefix, copiedId, onCopy }) {
  return (
    <dl className="pm-rows">
      {rows.map((row) => {
        const rowId = `${idPrefix}:${row.key}`
        const copied = copiedId === rowId
        const url = safeUrl(row.value)
        return (
          <div className="pm-row" key={rowId}>
            <dt className="pm-row-label">{row.label}</dt>
            <dd className="pm-row-value">
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">{row.value}</a>
              ) : (
                <span>{row.value}</span>
              )}
              <button
                type="button"
                className="pm-row-copy"
                onClick={() => onCopy(rowId, row.value, row.label)}
                title={`Copiar ${row.label.toLowerCase()}`}
                aria-label={`Copiar ${row.label.toLowerCase()}`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/**
 * Modal de cobro: el cliente elige con qué método paga un importe concreto.
 *
 * Se monta solo cuando está abierto (`{open && <PaymentDialog … />}`), así el
 * catálogo se pide al abrir y el estado se tira al cerrar.
 *
 * @param {() => void}      onClose     Cerrar (Escape, fondo o botón).
 * @param {number|string}   amount      Importe pendiente.
 * @param {string|null}     currency    Código ISO del importe.
 * @param {string}          [reference] Referencia a citar en el pago (nº de factura).
 * @param {string}          [fallbackUrl] Enlace propio del documento; solo se
 *                                      ofrece si el catálogo viene vacío.
 * @param {(msg: string) => void} [onNotify] Toast del contenedor.
 */
export function PaymentDialog({
  onClose,
  amount,
  currency,
  reference,
  fallbackUrl,
  onNotify,
}) {
  const { methods, loading, error, refetch } = usePaymentMethods()
  const { copiedId, onCopy } = useMethodCopy(onNotify)
  const panelRef = useRef(null)
  const titleId = useRef(`pm-dialog-${Math.random().toString(36).slice(2)}`).current

  // `onClose` por ref: si el contenedor pasa una función inline, un efecto que
  // dependiera de ella se re-ejecutaría en cada render y devolvería el foco al
  // panel mientras el cliente está copiando un IBAN.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Escape cierra. El foco entra en el panel al abrir para no dejarlo detrás.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const backupUrl = safeUrl(fallbackUrl)

  return (
    <div
      className="pm-modal-overlay"
      // Sin backdrop-filter a propósito: la barra superior y el sidebar ya
      // llevan el suyo y, al superponerse dos capas que difuminan el fondo,
      // el navegador no puede muestrearlo y pinta una franja negra arriba.
      // Un velo opaco da el mismo resultado visual sin ese artefacto.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="pm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="pm-modal-head">
          <div className="pm-card-icon">
            <CreditCard size={18} strokeWidth={1.6} />
          </div>
          <div className="pm-modal-heading">
            <h2 className="pm-modal-title" id={titleId}>Elige cómo pagar</h2>
            <p className="pm-modal-sub">
              {reference
                ? `Métodos habilitados para tu cuenta · ${reference}`
                : 'Métodos habilitados para tu cuenta'}
            </p>
          </div>
          <button
            type="button"
            className="pr-btn ghost sm icon-only pm-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="pm-modal-amount">
          <span className="pm-modal-amount-label">Importe pendiente</span>
          <span className="pm-modal-amount-value">{formatMoney(amount, currency)}</span>
        </div>

        <div className="pm-modal-body">
          {loading ? (
            <div className="pm-modal-state">
              <span className="pr-spinner" aria-label="Cargando métodos de pago" />
            </div>
          ) : error ? (
            <div className="pm-modal-state">
              <Wallet size={28} color="var(--pr-accent-gray)" />
              <p className="pm-modal-state-title">No se pudieron cargar los métodos de pago</p>
              <p className="pm-note">{error}</p>
              <button type="button" className="pr-btn primary sm" onClick={refetch}>
                Reintentar
              </button>
            </div>
          ) : methods.length === 0 ? (
            <div className="pm-modal-state">
              <Wallet size={28} color="var(--pr-accent-gray)" />
              <p className="pm-modal-state-title">Todavía no hay métodos de pago habilitados</p>
              <p className="pm-note">
                {backupUrl
                  ? 'El equipo aún no ha configurado el catálogo para tu cuenta. Mientras tanto puedes usar el enlace de pago de esta factura.'
                  : 'El equipo aún no ha configurado ninguna forma de pago para tu cuenta. Escríbenos y te indicamos cómo pagar.'}
              </p>
              {backupUrl && (
                <a
                  className="pr-btn primary sm"
                  href={backupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={13} /> Ir al enlace de pago
                </a>
              )}
            </div>
          ) : (
            <PaymentMethodList methods={methods} copiedId={copiedId} onCopy={onCopy} />
          )}
        </div>
      </div>
    </div>
  )
}
