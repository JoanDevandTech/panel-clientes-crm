import { useMemo } from 'react'
import { useRoute } from 'wouter'
import {
  Flag,
  ExternalLink,
  Users,
  Code,
  CreditCard,
  Shield,
  Gift,
  Mail,
  MessageSquare,
} from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../hooks/useAuth'
import { clientCurrency, formatMoney, resolveCurrency } from '../../../utils/money'

const ACCENT_BY_BADGE = {
  green: 'pd-accent-green',
  cyan: 'pd-accent-cyan',
  gray: 'pd-accent-gray',
  amber: 'pd-accent-amber',
  blue: 'pd-accent-blue',
  red: 'pd-accent-red',
}

// Krom: acento único. Los favicons de enlace van todos en cian sobre el fondo.
const QUICK_LINK_BG = 'var(--pr-accent-cyan)'

const FINANCIAL_STATUS_LABEL = {
  approved: 'Aprobado',
  signed: 'Firmado',
  paid: 'Pagada',
  pending: 'Pendiente',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
}

const FINANCIAL_STATUS_COLOR = {
  approved: 'green',
  signed: 'green',
  paid: 'green',
  pending: 'amber',
  overdue: 'red',
  cancelled: 'red',
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Algunos importes llegan ya formateados desde el backend: se respetan tal cual.
function formatAmount(amount, currency) {
  if (amount == null) return ''
  if (typeof amount === 'string') return amount
  return formatMoney(amount, currency, { fallback: '' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function unwrap(payload) {
  if (payload == null) return payload
  if (typeof payload === 'object' && 'data' in payload) return payload.data
  return payload
}

export default function TabResumen({ project, stats, onJumpTab, onShowToast }) { // eslint-disable-line no-unused-vars
  const { client } = useAuth()
  const [, params] = useRoute('/portal/projects/:id')
  const projectId = params?.id

  const phase = project?.phase
  const team = project?.team_members ?? []
  const techStack = project?.tech_stack ?? []

  const showBanner = phase === 'completed'
  const showNextMilestoneSection =
    phase === 'in_development' || phase === 'in_progress' || phase === 'review'
  const showWarranty = phase === 'completed' || phase === 'maintenance'

  const {
    data: quickLinksRaw,
    loading: quickLinksLoading,
    error: quickLinksError,
  } = useApi(`/client/projects/${projectId}/quick-links`, { immediate: !!projectId })

  const {
    data: financialsRaw,
    loading: financialsLoading,
    error: financialsError,
  } = useApi(`/client/projects/${projectId}/financials`, { immediate: !!projectId })

  const {
    data: milestonesRaw,
  } = useApi(
    `/client/projects/${projectId ?? ''}/milestones`,
    { immediate: !!projectId && showNextMilestoneSection }
  )

  const quickLinks = useMemo(() => {
    const list = unwrap(quickLinksRaw)
    if (!Array.isArray(list)) return []
    return list
  }, [quickLinksRaw])

  // Cada documento (presupuesto, contrato, factura) trae su propia moneda; si
  // falta, la del cliente autenticado. Aquí no se suma nada: cada línea se
  // muestra por separado, así que no hay riesgo de mezclar monedas.
  const fallbackCurrency = clientCurrency(client)

  const financialItems = useMemo(() => {
    const payload = unwrap(financialsRaw) || {}
    const budgets = Array.isArray(payload.budgets) ? payload.budgets : []
    const contracts = Array.isArray(payload.contracts) ? payload.contracts : []
    const invoices = Array.isArray(payload.invoices) ? payload.invoices : []

    const items = []
    budgets.forEach((b) => {
      items.push({
        key: `budget-${b.id}`,
        label: `Presupuesto ${b.number ?? ''}`.trim(),
        total: b.total,
        currency: resolveCurrency(b.currency, fallbackCurrency),
        status: b.status,
      })
    })
    contracts.forEach((c) => {
      items.push({
        key: `contract-${c.id}`,
        label: `Contrato ${c.number ?? ''}`.trim(),
        total: c.total,
        currency: resolveCurrency(c.currency, fallbackCurrency),
        status: c.status,
      })
    })
    invoices.forEach((inv) => {
      items.push({
        key: `invoice-${inv.id}`,
        label: `Factura ${inv.number ?? ''}`.trim(),
        total: inv.total,
        currency: resolveCurrency(inv.currency, fallbackCurrency),
        status: inv.status,
      })
    })
    return items
  }, [financialsRaw, fallbackCurrency])

  const nextMilestone = useMemo(() => {
    if (!showNextMilestoneSection) return null
    const list = unwrap(milestonesRaw)
    if (!Array.isArray(list)) return null
    return (
      list.find((m) => m && (m.status === 'pending' || m.status === 'in_progress')) || null
    )
  }, [milestonesRaw, showNextMilestoneSection])

  const warrantyDaysRemaining = useMemo(
    () => daysUntil(project?.warranty_until),
    [project?.warranty_until]
  )

  return (
    <div
      className="pd-tab-content pd-grid-2"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
    >
      {showBanner && (
        <div className="pd-banner" style={{ gridColumn: '1 / -1' }}>
          <Gift size={18} style={{ color: '#34D399' }} />
          <span>
            <strong>Proyecto entregado</strong>
            {project?.delivered_at && <> el {project.delivered_at}</>}
            {project?.warranty_until && <>. Garantía hasta el {project.warranty_until}</>}
            .
          </span>
          <button
            className="pd-banner-action"
            type="button"
            onClick={() => (window.location.href = '/portal/tickets/new')}
          >
            ¿Necesitas algo? Abrir ticket →
          </button>
        </div>
      )}

      {showNextMilestoneSection && nextMilestone && (
        <div className="pd-card pd-hoverable" style={{ gridColumn: '1 / -1' }}>
          <div className="pd-card-head">
            <div className="pd-card-head-icon pd-accent-cyan">
              <Flag size={16} />
            </div>
            <div className="pd-card-head-title">Próximo hito</div>
            <button
              className="pd-card-head-action"
              type="button"
              onClick={() => onJumpTab && onJumpTab('milestones')}
            >
              Ver todos los hitos →
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
                {nextMilestone.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--pd-text-muted)' }}>
                {nextMilestone.estimated_date && (
                  <>Estimado para el {nextMilestone.estimated_date}</>
                )}
                {Array.isArray(nextMilestone.linked_deliverables) && (
                  <>
                    {nextMilestone.estimated_date ? ' · ' : ''}
                    {nextMilestone.linked_deliverables.length} entregables vinculados
                  </>
                )}
                {!nextMilestone.estimated_date &&
                  !Array.isArray(nextMilestone.linked_deliverables) &&
                  'Pendiente'}
              </div>
            </div>
            <div style={{ minWidth: 200 }}>
              <div className="pd-progress-bar">
                <div
                  className="pd-progress-bar-fill"
                  style={{ width: `${nextMilestone.progress ?? nextMilestone.weight ?? 0}%` }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--pd-text-muted)', marginTop: 6 }}>
                {nextMilestone.progress ?? nextMilestone.weight ?? 0}% completado
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="pd-card pd-hoverable">
        <div className="pd-card-head">
          <div className="pd-card-head-icon pd-accent-cyan">
            <ExternalLink size={16} />
          </div>
          <div className="pd-card-head-title">Accesos rápidos</div>
        </div>
        {quickLinksLoading ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>
            Cargando accesos…
          </p>
        ) : quickLinksError ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>No disponible.</p>
        ) : quickLinks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>
            Sin accesos rápidos configurados.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {quickLinks.map((qa, i) => {
              const initial = (qa.icon || qa.label || 'L').toString().charAt(0).toUpperCase()
              return (
                <a
                  key={qa.id ?? `${qa.label}-${i}`}
                  className="pd-chip"
                  href={qa.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span
                    className="pd-chip-favicon"
                    style={{ background: QUICK_LINK_BG, color: 'var(--pr-bg-primary)' }}
                  >
                    {initial}
                  </span>
                  <span>{qa.label}</span>
                  <ExternalLink size={11} style={{ color: 'var(--pd-text-muted)' }} />
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Equipo asignado */}
      <div className="pd-card pd-hoverable">
        <div className="pd-card-head">
          <div className="pd-card-head-icon pd-accent-cyan">
            <Users size={16} />
          </div>
          <div className="pd-card-head-title">Equipo asignado</div>
          <span className="pd-badge gray" style={{ marginLeft: 'auto' }}>
            <span className="pd-badge-dot solo" />
            {team.length} {team.length === 1 ? 'persona' : 'personas'}
          </span>
        </div>
        {team.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>
            Aún no hay miembros asignados.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {team.map((m) => (
              <div
                key={m.id || m.name}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt={m.name}
                    style={{
                      width: 36,
                      height: 36,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: 'var(--pr-bg-card-hover)',
                      border: '1px solid var(--pr-border-strong)',
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--pr-font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--pr-accent-cyan)',
                    }}
                  >
                    {getInitials(m.name)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--pd-text-muted)' }}>{m.role}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="pd-btn pd-icon-only pd-btn-ghost pd-sm"
                    type="button"
                    title="Enviar mensaje"
                  >
                    <MessageSquare size={13} />
                  </button>
                  <button
                    className="pd-btn pd-icon-only pd-btn-ghost pd-sm"
                    type="button"
                    title="Email"
                  >
                    <Mail size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stack técnico */}
      <div className="pd-card pd-hoverable">
        <div className="pd-card-head">
          <div className="pd-card-head-icon pd-accent-blue">
            <Code size={16} />
          </div>
          <div className="pd-card-head-title">Stack técnico</div>
          <span className="pd-card-head-action" style={{ fontSize: 11 }}>
            Útil para soporte
          </span>
        </div>
        {techStack.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>
            Sin stack técnico definido.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {techStack.map((label, i) => (
              <span key={`${label}-${i}`} className="pd-chip">
                <span style={{ color: 'var(--pd-text-primary)', fontWeight: 500 }}>{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resumen financiero */}
      <div className="pd-card pd-hoverable">
        <div className="pd-card-head">
          <div className="pd-card-head-icon pd-accent-green">
            <CreditCard size={16} />
          </div>
          <div className="pd-card-head-title">Resumen financiero</div>
          <button
            className="pd-card-head-action"
            type="button"
            onClick={() => (window.location.href = '/portal/invoices')}
          >
            Ver facturas →
          </button>
        </div>
        {financialsLoading ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>
            Cargando información financiera…
          </p>
        ) : financialsError ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>No disponible.</p>
        ) : financialItems.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--pd-text-muted)', margin: 0 }}>
            Sin información financiera vinculada.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {financialItems.map((f, i) => {
              const badgeColor = FINANCIAL_STATUS_COLOR[f.status] || 'gray'
              const statusLabel = FINANCIAL_STATUS_LABEL[f.status] || f.status || ''
              return (
                <div
                  key={f.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom:
                      i < financialItems.length - 1 ? '1px solid var(--pd-border)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--pd-text-muted)' }}>
                      {formatAmount(f.total, f.currency)}
                    </div>
                  </div>
                  <span className={`pd-badge ${badgeColor}`}>
                    <span className="pd-badge-dot solo" />
                    {statusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Garantía y mantenimiento */}
      {showWarranty && (
        <div className="pd-card pd-hoverable" style={{ gridColumn: '1 / -1' }}>
          <div className="pd-card-head">
            <div className="pd-card-head-icon pd-accent-amber">
              <Shield size={16} />
            </div>
            <div className="pd-card-head-title">Garantía y mantenimiento</div>
            {project?.maintenance_plan?.active && (
              <span className="pd-badge cyan" style={{ marginLeft: 'auto' }}>
                <span className="pd-badge-dot" />
                Plan activo
              </span>
            )}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {project?.delivered_at && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--pd-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  Entregado
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{project.delivered_at}</div>
              </div>
            )}
            {project?.warranty_until && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--pd-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  Garantía hasta
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#FBBF24' }}>
                  {project.warranty_until}
                </div>
                {warrantyDaysRemaining != null && (
                  <div
                    style={{ fontSize: 11, color: 'var(--pd-text-muted)', marginTop: 2 }}
                  >
                    {warrantyDaysRemaining} días restantes
                  </div>
                )}
              </div>
            )}
            {project?.maintenance_plan && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--pd-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  Plan de mantenimiento
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {project.maintenance_plan.name}
                </div>
                {project.maintenance_plan.renews_on && (
                  <div
                    style={{ fontSize: 11, color: 'var(--pd-text-muted)', marginTop: 2 }}
                  >
                    Renueva el {project.maintenance_plan.renews_on}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { ACCENT_BY_BADGE, getInitials }
