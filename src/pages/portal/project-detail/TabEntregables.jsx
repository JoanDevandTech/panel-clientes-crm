import { useMemo, useState } from 'react'
import { Search, Eye, Download, Loader2, AlertCircle } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import api, { getAccessToken, BASE_URL } from '../../../services/api'

const CATEGORY_INFO = {
  design:        { label: 'Diseño',        badge: 'gray' },
  documentation: { label: 'Documentación', badge: 'blue' },
  code:          { label: 'Código',        badge: 'green' },
  video:         { label: 'Video',         badge: 'amber' },
  assets:        { label: 'Assets',        badge: 'cyan' },
  other:         { label: 'Otros',         badge: 'gray' },
}

const VISUAL_PRESETS = {
  pdf: {
    bg: 'var(--pr-blue-bg)',
    glyph: 'PDF',
    color: '#60A5FA',
  },
  image: {
    bg: 'var(--pr-cyan-bg)',
    glyph: 'IMG',
    color: 'var(--pr-accent-cyan)',
  },
  video: {
    bg: 'var(--pr-amber-bg)',
    glyph: 'MP4',
    color: '#FBBF24',
  },
  code: {
    bg: 'var(--pr-green-bg)',
    glyph: 'CODE',
    color: '#34D399',
  },
  zip: {
    bg: 'var(--pr-green-bg)',
    glyph: 'ZIP',
    color: '#34D399',
  },
  design: {
    bg: 'var(--pr-gray-bg)',
    glyph: 'FIG',
    color: 'var(--pr-text-read)',
  },
  doc: {
    bg: 'var(--pr-blue-bg)',
    glyph: 'DOC',
    color: '#60A5FA',
  },
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'])
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi'])
const CODE_EXTS = new Set(['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'php', 'py', 'go', 'rb'])
const ZIP_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz'])
const DESIGN_EXTS = new Set(['fig', 'sketch', 'xd', 'psd', 'ai'])

function getExtension(fileName = '') {
  const idx = fileName.lastIndexOf('.')
  if (idx < 0) return ''
  return fileName.slice(idx + 1).toLowerCase()
}

function pickPreview(d) {
  const mime = (d.mime_type || '').toLowerCase()
  const ext = getExtension(d.file_name || '')

  // PDF
  if (mime === 'application/pdf' || ext === 'pdf') {
    return { ...VISUAL_PRESETS.pdf, useThumbnail: false }
  }
  // Image
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) {
    return { ...VISUAL_PRESETS.image, useThumbnail: Boolean(d.thumbnail_url) }
  }
  // Video
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) {
    return { ...VISUAL_PRESETS.video, useThumbnail: false }
  }
  // Design
  if (DESIGN_EXTS.has(ext)) {
    return {
      ...VISUAL_PRESETS.design,
      glyph: ext.toUpperCase(),
      useThumbnail: false,
    }
  }
  // Zip / archive
  if (ZIP_EXTS.has(ext)) {
    return { ...VISUAL_PRESETS.zip, glyph: ext.toUpperCase(), useThumbnail: false }
  }
  // Code
  if (CODE_EXTS.has(ext) || mime.includes('javascript') || mime.includes('json') || mime.includes('html')) {
    return { ...VISUAL_PRESETS.code, useThumbnail: false }
  }
  // Default: doc with extension as glyph
  return {
    ...VISUAL_PRESETS.doc,
    glyph: ext ? ext.toUpperCase() : 'DOC',
    useThumbnail: false,
  }
}

function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DATE_FMT = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return DATE_FMT.format(d)
}

async function downloadDeliverable(projectId, deliverable) {
  const response = await fetch(
    `${BASE_URL}/client/projects/${projectId}/deliverables/${deliverable.id}/download`,
    {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    },
  )
  if (!response.ok) throw new Error('No se pudo descargar el entregable.')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = deliverable.file_name || deliverable.title || 'entregable'
  a.click()
  window.URL.revokeObjectURL(url)
}

function DeliverableCard({ d, projectId, onShowToast }) {
  const v = pickPreview(d)
  const [downloading, setDownloading] = useState(false)
  const [opening, setOpening] = useState(false)

  const cat = CATEGORY_INFO[d.category] || CATEGORY_INFO.other
  const ext = getExtension(d.file_name || '')

  const handlePreview = async () => {
    if (opening) return
    if (d.preview_url) {
      window.open(d.preview_url, '_blank', 'noopener,noreferrer')
      return
    }
    setOpening(true)
    try {
      const res = await api.get(`/client/projects/${projectId}/deliverables/${d.id}/preview`)
      const url = res?.data?.url ?? res?.url
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        onShowToast?.(`Vista previa no disponible para ${d.title}`)
      }
    } catch {
      onShowToast?.(`Vista previa no disponible para ${d.title}`)
    } finally {
      setOpening(false)
    }
  }

  const handleDownload = async () => {
    if (downloading || !d.is_downloadable) return
    setDownloading(true)
    onShowToast?.(`Descargando ${d.title}…`)
    try {
      await downloadDeliverable(projectId, d)
    } catch {
      onShowToast?.(`No se pudo descargar ${d.title}`)
    } finally {
      setDownloading(false)
    }
  }

  const previewStyle = v.useThumbnail && d.thumbnail_url
    ? {
        height: 130,
        background: `url(${d.thumbnail_url}) center/cover, ${v.bg}`,
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        borderBottom: '1px solid var(--pd-border)',
      }
    : {
        height: 130,
        background: v.bg,
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        borderBottom: '1px solid var(--pd-border)',
      }

  return (
    <div
      className="pd-card pd-hoverable"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={previewStyle}>
        {!(v.useThumbnail && d.thumbnail_url) && (
          <div
            style={{
              background: 'rgba(13, 14, 17,0.35)',
              border: `1px solid ${v.color}40`,
              color: v.color,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: 'var(--pr-font-mono)',
            }}
          >
            {v.glyph}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 14px, rgba(248, 249, 250,0.025) 14px 15px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={d.title}
            >
              {d.title}
            </div>
            <span
              className={`pd-badge ${cat.badge}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              {cat.label}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--pd-text-muted)',
            marginTop: 'auto',
            gap: 8,
          }}
        >
          <span style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            {ext || 'file'}
            {d.file_size ? ` · ${formatFileSize(d.file_size)}` : ''}
          </span>
          <span>{formatDate(d.uploaded_at)}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            className="pd-btn pd-btn-ghost pd-sm"
            type="button"
            style={{ flex: 1 }}
            onClick={handlePreview}
            disabled={opening}
          >
            {opening ? <Loader2 size={13} className="pd-spin" /> : <Eye size={13} />} Vista previa
          </button>
          <button
            className="pd-btn pd-sm"
            type="button"
            style={{
              flex: 1,
              background: 'rgba(0, 229, 255,0.15)',
              borderColor: 'rgba(0, 229, 255,0.3)',
              color: 'var(--pr-text-read)',
              opacity: d.is_downloadable ? 1 : 0.5,
              cursor: d.is_downloadable ? 'pointer' : 'not-allowed',
            }}
            onClick={handleDownload}
            disabled={!d.is_downloadable || downloading}
            title={d.is_downloadable ? 'Descargar' : 'Descarga no disponible'}
          >
            {downloading ? <Loader2 size={13} className="pd-spin" /> : <Download size={13} />} Descargar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TabEntregables({ projectId, onShowToast }) {
  const { data, loading, error, refetch } = useApi(
    `/client/projects/${projectId}/deliverables`,
    { immediate: !!projectId },
  )

  const deliverables = useMemo(() => {
    if (!data) return []
    return Array.isArray(data) ? data : data?.data ?? []
  }, [data])

  const [filter, setFilter] = useState('Todos')
  const [query, setQuery] = useState('')

  const cats = useMemo(() => {
    const set = new Set()
    deliverables.forEach((d) => {
      if (d.category) set.add(d.category)
    })
    return ['Todos', ...Array.from(set)]
  }, [deliverables])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return deliverables.filter((d) => {
      const matchesCat = filter === 'Todos' || d.category === filter
      const matchesQuery =
        !q ||
        (d.title || '').toLowerCase().includes(q) ||
        (d.file_name || '').toLowerCase().includes(q)
      return matchesCat && matchesQuery
    })
  }, [deliverables, filter, query])

  if (loading) {
    return (
      <div className="pd-tab-content">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} className="pd-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-tab-content">
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><AlertCircle size={32} /></div>
            <div>
              <p className="pd-empty-state-title">No se pudieron cargar los entregables</p>
              <p className="pd-empty-state-desc">Comprueba tu conexión y vuelve a intentarlo.</p>
              <button
                type="button"
                className="pd-btn pd-btn-ghost pd-sm"
                onClick={() => refetch()}
                style={{ marginTop: 12 }}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (deliverables.length === 0) {
    return (
      <div className="pd-tab-content">
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><Download size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Sin entregables todavía</p>
              <p className="pd-empty-state-desc">
                Los entregables aparecerán aquí cuando completemos hitos.
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
          <h2 className="pd-section-title">Entregables</h2>
          <p className="pd-section-sub">
            {deliverables.length} {deliverables.length === 1 ? 'archivo disponible' : 'archivos disponibles'}
            {' · enlaces firmados con 15 min de validez'}
          </p>
        </div>
        <div className="pd-section-actions">
          <div className="pd-search" style={{ width: 220 }}>
            <Search size={14} />
            <input
              placeholder="Buscar entregable…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="pd-btn pd-btn-ghost pd-sm"
            type="button"
            onClick={() => onShowToast?.('Función disponible próximamente')}
          >
            <Download size={13} /> Descargar todos
          </button>
        </div>
      </div>

      {cats.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {cats.map((c) => {
            const label = c === 'Todos' ? 'Todos' : (CATEGORY_INFO[c]?.label ?? c)
            return (
              <button
                key={c}
                type="button"
                className="pd-chip"
                onClick={() => setFilter(c)}
                style={
                  filter === c
                    ? {
                        background: 'rgba(0, 229, 255,0.15)',
                        borderColor: 'rgba(0, 229, 255,0.35)',
                        color: 'var(--pr-text-read)',
                      }
                    : undefined
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><Search size={32} /></div>
            <div>
              <p className="pd-empty-state-title">Sin resultados</p>
              <p className="pd-empty-state-desc">
                No encontramos entregables que coincidan con tu búsqueda.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {filtered.map((d) => (
            <DeliverableCard
              key={d.id}
              d={d}
              projectId={projectId}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}
    </div>
  )
}
