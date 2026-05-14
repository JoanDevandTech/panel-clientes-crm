import { useEffect, useMemo, useState } from 'react'
import { Image, X, ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'

const MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Replicamos formato corto es-ES "25 oct 2024" sin depender de Intl en runtimes pobres.
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(d)
      .replace('.', '')
  } catch (_) {
    return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`
  }
}

function hueFromId(id) {
  const n = Number(id) || 0
  return ((n * 40) % 360 + 360) % 360
}

function PlaceholderArt({ id, label }) {
  const hue = hueFromId(id)
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/10',
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 28%) 0%, hsl(${(hue + 30) % 360}, 50%, 18%) 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.05) 12px 13px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 14,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function CaptureThumb({ c }) {
  const [failed, setFailed] = useState(false)
  const src = c.thumbnail_url || c.image_url
  if (failed || !src) {
    return <PlaceholderArt id={c.id} label={`SNAP_${String(c.id ?? '').toUpperCase()}`} />
  }
  return (
    <img
      src={src}
      alt={c.title || ''}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  )
}

function LightboxImage({ c }) {
  const [failed, setFailed] = useState(false)
  const src = c.image_url || c.thumbnail_url
  // Reset failed state cada vez que cambia la captura.
  useEffect(() => {
    setFailed(false)
  }, [c.id, src])

  if (failed || !src) {
    return (
      <div style={{ width: 'min(80vw, 1100px)' }}>
        <PlaceholderArt id={c.id} label={`SNAP_${String(c.id ?? '').toUpperCase()}`} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={c.title || ''}
      onError={() => setFailed(true)}
      style={{
        maxWidth: '80vw',
        maxHeight: '80vh',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        display: 'block',
        borderRadius: 12,
        border: '1px solid var(--pd-border)',
      }}
    />
  )
}

function Lightbox({ item, onClose, onPrev, onNext, idx, total }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        display: 'grid',
        placeItems: 'center',
        animation: 'pd-tab-enter 200ms var(--pd-ease)',
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--pd-border)',
          borderRadius: 8,
          padding: 10,
          color: 'white',
          cursor: 'pointer',
        }}
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPrev()
        }}
        style={{
          position: 'absolute',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--pd-border)',
          borderRadius: 8,
          padding: 12,
          color: 'white',
          cursor: 'pointer',
        }}
        aria-label="Anterior"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
        style={{
          position: 'absolute',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--pd-border)',
          borderRadius: 8,
          padding: 12,
          color: 'white',
          cursor: 'pointer',
        }}
        aria-label="Siguiente"
      >
        <ChevronRight size={20} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '80vw', maxHeight: '90vh', textAlign: 'center' }}
      >
        <LightboxImage c={item} />
        <div style={{ marginTop: 16, color: 'white' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{item?.title}</div>
          {item?.milestone_id && item?.milestone_title && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
              <span
                className="pd-chip"
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  background: 'rgba(168,85,247,0.18)',
                  borderColor: 'rgba(168,85,247,0.4)',
                }}
              >
                <Flag size={12} /> Vinculado al hito: {item.milestone_title} →
              </span>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            {formatDate(item?.captured_at)} · {idx + 1} / {total}
          </div>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid #a855f7',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'pd-spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes pd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function TabCapturas({ projectId }) {
  const { data, loading, error, refetch } = useApi(
    `/client/projects/${projectId}/screenshots`,
    { immediate: !!projectId },
  )
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [filterMs, setFilterMs] = useState('Todos')

  const payload = data?.data ?? data
  const captures = useMemo(() => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  }, [payload])

  const milestoneTitles = useMemo(() => {
    const titles = new Set()
    captures.forEach((c) => {
      if (c?.milestone_title) titles.add(c.milestone_title)
    })
    return ['Todos', ...Array.from(titles)]
  }, [captures])

  const filtered = useMemo(() => {
    if (filterMs === 'Todos') return captures
    return captures.filter((c) => c.milestone_title === filterMs)
  }, [captures, filterMs])

  // Si cambia el filtro y el índice queda fuera de rango, cerramos el lightbox.
  useEffect(() => {
    if (lightboxIdx != null && lightboxIdx >= filtered.length) {
      setLightboxIdx(null)
    }
  }, [filtered.length, lightboxIdx])

  useEffect(() => {
    if (lightboxIdx == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIdx(null)
      if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % filtered.length)
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i - 1 + filtered.length) % filtered.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, filtered.length])

  if (loading) {
    return (
      <div className="pd-tab-content">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-tab-content">
        <div
          className="pd-card"
          style={{
            padding: 24,
            textAlign: 'center',
            borderColor: 'rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.08)',
          }}
        >
          <p style={{ color: '#f87171', marginBottom: 16, fontSize: 13 }}>{error}</p>
          <button type="button" className="pd-btn pd-btn-ghost pd-sm" onClick={refetch}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (captures.length === 0) {
    return (
      <div className="pd-tab-content">
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><Image size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Sin capturas aún</p>
              <p className="pd-empty-state-desc">
                A medida que avancemos compartiremos screenshots del progreso.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pd-tab-content">
      <div className="pd-section-head">
        <div>
          <h2 className="pd-section-title">Capturas del proyecto</h2>
          <p className="pd-section-sub">
            {captures.length} {captures.length === 1 ? 'imagen' : 'imágenes'} · pulsa cualquier captura para verla a tamaño completo
          </p>
        </div>
        {milestoneTitles.length > 1 && (
          <div className="pd-section-actions">
            <select
              value={filterMs}
              onChange={(e) => setFilterMs(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'var(--pd-bg-input)',
                border: '1px solid var(--pd-border)',
                borderRadius: 8,
                color: 'var(--pd-text-primary)',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {milestoneTitles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pd-masonry" style={{ columnCount: 4, columnGap: 14 }}>
        {filtered.map((c, i) => (
          <button
            key={c.id ?? i}
            type="button"
            onClick={() => setLightboxIdx(i)}
            style={{
              width: '100%',
              breakInside: 'avoid',
              marginBottom: 14,
              padding: 0,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--pd-border)',
              background: 'var(--pd-bg-card)',
              cursor: 'pointer',
              display: 'block',
              transition: 'all 200ms var(--pd-ease)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'var(--pd-border-strong)'
              e.currentTarget.style.boxShadow = 'var(--pd-shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.borderColor = 'var(--pd-border)'
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <CaptureThumb c={c} />
            <div style={{ padding: '10px 12px', textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--pd-text-primary)' }}>
                {c.title}
              </div>
              {c.captured_at && (
                <div style={{ fontSize: 10, color: 'var(--pd-text-muted)', marginTop: 2 }}>
                  {formatDate(c.captured_at)}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {lightboxIdx != null && filtered[lightboxIdx] && (
        <Lightbox
          item={filtered[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i - 1 + filtered.length) % filtered.length)}
          onNext={() => setLightboxIdx((i) => (i + 1) % filtered.length)}
          idx={lightboxIdx}
          total={filtered.length}
        />
      )}
    </div>
  )
}
