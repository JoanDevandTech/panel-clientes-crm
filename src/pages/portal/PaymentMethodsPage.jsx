import { useMemo, useState } from 'react'
import { Link } from 'wouter'
import {
  ArrowLeft,
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
  LifeBuoy,
  Link2,
  QrCode,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import './payment-methods.css'

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

function resolveIcon(slug) {
  if (typeof slug !== 'string') return DEFAULT_ICON
  // heroicon-o-credit-card | heroicon-s-wallet | credit-card → credit-card
  const clean = slug.trim().toLowerCase().replace(/^heroicon-[a-z]+-/, '')
  return ICON_MAP[clean] || DEFAULT_ICON
}

/* Etiqueta de tipo. Solo para los tipos que conocemos: un tipo nuevo no
   inventa badge, se queda sin él. */
const TYPE_META = {
  link: { badge: 'cyan', label: 'Enlace de pago' },
  bank_transfer: { badge: 'blue', label: 'Transferencia' },
}

/* Campos conocidos de config.bank_transfer, en orden de lectura.
   Cualquiera puede venir null o ausente: no se pinta la fila. */
const BANK_FIELDS = [
  { key: 'bank_name', label: 'Banco' },
  { key: 'account_number', label: 'Número de cuenta' },
  { key: 'account_holder', label: 'Titular' },
  { key: 'account_id_number', label: 'Documento del titular' },
]

function scalarText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function humanize(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/** Solo http(s): el valor viene de la API, no abrimos javascript: ni data:. */
function safeUrl(value) {
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
function buildRows(config, fields = [], skipKeys = []) {
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

async function copyText(text) {
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

// Toasts ligeros locales (mismo patrón que DocumentsPage)
function useToasts() {
  const [toasts, setToasts] = useState([])
  const showToast = (msg) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id, msg }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2400)
  }
  const ToastStack = () => (
    <div className="pr-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="pr-toast">
          <Check size={14} /> {t.msg}
        </div>
      ))}
    </div>
  )
  return { showToast, ToastStack }
}

export default function PaymentMethodsPage() {
  const { data, loading, error, refetch } = useApi('/client/payment-methods')
  const { showToast, ToastStack } = useToasts()
  const [copiedId, setCopiedId] = useState(null)

  // El array ya viene filtrado y ordenado por el admin: se pinta tal cual.
  const methods = useMemo(() => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    return []
  }, [data])

  const handleCopy = async (id, value, label) => {
    const ok = await copyText(value)
    if (!ok) {
      showToast('No se pudo copiar')
      return
    }
    setCopiedId(id)
    showToast(`${label} copiado`)
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600)
  }

  if (loading) {
    return (
      <div className="pr-loading">
        <span className="pr-spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="pr-page-header">
        <Link href="/portal/dashboard" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
        <div className="pr-page-header-row">
          <div>
            <h1 className="pr-page-title">Métodos de pago</h1>
            <p className="pr-page-sub">
              Las formas de pago que el equipo tiene habilitadas para tu cuenta.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><Wallet size={32} /></div>
            <div>
              <p className="pr-empty-title">No se pudieron cargar los métodos de pago</p>
              <p className="pr-empty-desc">{error}</p>
            </div>
            <button className="pr-btn primary sm" onClick={refetch} type="button">
              Reintentar
            </button>
          </div>
        </div>
      ) : methods.length === 0 ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><Wallet size={32} /></div>
            <div>
              <p className="pr-empty-title">No hay métodos de pago disponibles</p>
              <p className="pr-empty-desc">
                Cuando el equipo habilite una forma de pago para tu cuenta aparecerá aquí.
                Mientras tanto, escríbenos y te indicamos cómo pagar.
              </p>
            </div>
            <Link href="/portal/tickets/new" className="pr-btn primary sm">
              <LifeBuoy size={13} /> Contactar con el equipo
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="pm-grid">
            {methods.map((method, index) => (
              <MethodCard
                key={scalarText(method?.key) || `method-${index}`}
                id={scalarText(method?.key) || `method-${index}`}
                method={method}
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))}
          </div>

          <p className="pm-foot">
            ¿Necesitas otra forma de pago?{' '}
            <Link href="/portal/tickets/new">Abre un ticket</Link> y lo revisamos.
          </p>
        </>
      )}

      <ToastStack />
    </div>
  )
}

function MethodCard({ id, method, copiedId, onCopy }) {
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
function MethodBody({ id, method, copiedId, onCopy }) {
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

function InfoRows({ rows, idPrefix, copiedId, onCopy }) {
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
