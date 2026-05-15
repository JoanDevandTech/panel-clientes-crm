import { useMemo, useState } from 'react'
import { Link } from 'wouter'
import {
  ArrowLeft,
  Upload,
  Download,
  Eye,
  Share2,
  FileText,
  FileDown,
  Folder,
  Sparkles,
  Search,
  LayoutGrid,
  List as ListIcon,
  Check,
  Image as ImageIcon,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getAccessToken, BASE_URL } from '../../services/api'
import './documents.css'

// Categorías UI <-> tipo backend
const CATEGORY_META = {
  proposal: {
    label: 'Propuestas',
    badge: 'purple',
    accent: 'purple',
    glyph: 'PDF',
    color: '#c084fc',
  },
  contract: {
    label: 'Contratos',
    badge: 'blue',
    accent: 'blue',
    glyph: 'DOC',
    color: '#60a5fa',
  },
  report: {
    label: 'Informes',
    badge: 'cyan',
    accent: 'cyan',
    glyph: 'PDF',
    color: '#22d3ee',
  },
  deliverable: {
    label: 'Entregables',
    badge: 'green',
    accent: 'green',
    glyph: 'FILE',
    color: '#34d399',
  },
}

const FALLBACK_CATEGORY = {
  label: 'Otro',
  badge: 'gray',
  accent: 'gray',
  glyph: 'DOC',
  color: '#cbd5e1',
}

// Iconos lucide por tipo de fichero (basado en mime/ext)
function getFileIcon(doc) {
  const mime = (doc.mime_type || '').toLowerCase()
  const ext = (doc.extension || extractExt(doc.file_name || doc.name) || '').toLowerCase()
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return ImageIcon
  }
  if (mime === 'application/pdf' || ext === 'pdf') return FileText
  return FileDown
}

function extractExt(name) {
  if (!name || typeof name !== 'string') return ''
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1) : ''
}

function formatSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '—'
  const n = Number(bytes)
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' GB'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' MB'
  if (n >= 1_000) return Math.round(n / 1000) + ' KB'
  return n + ' B'
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
}

// Hue determinista por id/nombre para que la portada no parpadee
function hueFor(seed) {
  let str = String(seed ?? '')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

function previewStyle(doc) {
  const h = hueFor(doc.id ?? doc.file_name ?? doc.name)
  return {
    background: `linear-gradient(135deg, hsl(${h}, 55%, 28%) 0%, hsl(${(h + 30) % 360}, 45%, 18%) 100%)`,
  }
}

function thumbStyle(meta) {
  return {
    background: `${meta.color}15`,
    borderColor: `${meta.color}30`,
    color: meta.color,
  }
}

function glyphStyle(meta) {
  return {
    color: meta.color,
    borderColor: `${meta.color}40`,
  }
}

// Toasts ligeros locales
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

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [project, setProject] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const [downloading, setDownloading] = useState(null)
  const { showToast, ToastStack } = useToasts()

  const { data, loading, error, refetch } = useApi('/client/documents', {
    params: {
      type: activeTab !== 'all' ? activeTab : undefined,
    },
  })

  const documents = useMemo(() => {
    if (!data) return []
    return Array.isArray(data) ? data : (data?.data ?? [])
  }, [data])

  // Lista de proyectos para el select
  const projects = useMemo(() => {
    const set = new Map()
    documents.forEach((d) => {
      if (d.project_id != null && d.project_name) {
        set.set(String(d.project_id), d.project_name)
      } else if (d.project_name) {
        set.set(d.project_name, d.project_name)
      }
    })
    return Array.from(set, ([id, name]) => ({ id, name }))
  }, [documents])

  // Filtrado en cliente (búsqueda + proyecto)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents.filter((d) => {
      if (project !== 'all') {
        const pid = d.project_id != null ? String(d.project_id) : d.project_name
        if (pid !== project) return false
      }
      if (!q) return true
      const name = (d.file_name || d.name || '').toLowerCase()
      const proj = (d.project_name || '').toLowerCase()
      return name.includes(q) || proj.includes(q)
    })
  }, [documents, project, query])

  // Conteos por categoría (sobre el dataset crudo, ignorando filtros para que las pestañas no salten)
  const counts = useMemo(() => {
    const c = { all: documents.length, proposal: 0, contract: 0, report: 0, deliverable: 0 }
    documents.forEach((d) => {
      if (c[d.type] != null) c[d.type] += 1
    })
    return c
  }, [documents])

  // KPIs
  const kpis = useMemo(() => {
    const total = documents.length
    const contracts = documents.filter((d) => d.type === 'contract').length
    const deliverables = documents.filter((d) => d.type === 'deliverable').length
    const projectCount = projects.length
    const sorted = [...documents].sort((a, b) => {
      const da = new Date(a.uploaded_at || a.created_at || 0).getTime()
      const db = new Date(b.uploaded_at || b.created_at || 0).getTime()
      return db - da
    })
    const latest = sorted[0]
    return { total, contracts, deliverables, projectCount, latest }
  }, [documents, projects.length])

  const tabs = [
    { key: 'all', label: 'Todos', count: counts.all },
    { key: 'proposal', label: 'Propuestas', count: counts.proposal },
    { key: 'contract', label: 'Contratos', count: counts.contract },
    { key: 'report', label: 'Informes', count: counts.report },
    { key: 'deliverable', label: 'Entregables', count: counts.deliverable },
  ]

  const handleDownload = async (e, doc) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloading(doc.id)
    showToast(`Descargando ${doc.file_name || doc.name}…`)
    try {
      const response = await fetch(`${BASE_URL}/client/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name || doc.name || `documento-${doc.id}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setDownloading(null)
    }
  }

  const handlePreview = (e, doc) => {
    e.preventDefault()
    e.stopPropagation()
    showToast(`Abriendo ${doc.file_name || doc.name}…`)
    window.open(`${BASE_URL}/client/documents/${doc.id}/download`, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="pr-loading">
        <span className="pr-spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader />
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><FileText size={32} /></div>
            <div>
              <p className="pr-empty-title">No se pudieron cargar los documentos</p>
              <p className="pr-empty-desc">{error}</p>
            </div>
            <button className="pr-btn primary sm" onClick={refetch}>Reintentar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader onUpload={() => showToast('Subida de documentos no disponible aún.')} onDownloadAll={() => showToast('Generando ZIP con todo…')} />

      {/* KPIs */}
      <div className="docs-kpi-row">
        <Kpi
          icon={FileText}
          accent="purple"
          value={kpis.total}
          label="Documentos"
          sub={`${kpis.projectCount} proyecto${kpis.projectCount === 1 ? '' : 's'} cubierto${kpis.projectCount === 1 ? '' : 's'}`}
        />
        <Kpi
          icon={FileText}
          accent="blue"
          value={kpis.contracts}
          label="Contratos"
          sub="firmas registradas"
        />
        <Kpi
          icon={Download}
          accent="green"
          value={kpis.deliverables}
          label="Entregables"
          sub="archivos finales"
        />
        <Kpi
          icon={Sparkles}
          accent="cyan"
          value={kpis.latest ? truncate(kpis.latest.file_name || kpis.latest.name || '—', 24) : '—'}
          label="Más reciente"
          sub={kpis.latest ? formatDate(kpis.latest.uploaded_at || kpis.latest.created_at) : '—'}
        />
      </div>

      {/* Filter bar */}
      <div className="pr-filterbar">
        <div className="pr-filterbar-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`pr-filter-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              <span className="pr-filter-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="pr-filterbar-right">
          <div className="pr-search" style={{ width: 240 }}>
            <Search size={14} />
            <input
              placeholder="Buscar documentos…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="pr-select"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="all">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="docs-view-toggle">
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              title="Vista cuadrícula"
              type="button"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              title="Vista lista"
              type="button"
            >
              <ListIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><FileText size={32} /></div>
            <div>
              <p className="pr-empty-title">Sin documentos en esta categoría</p>
              <p className="pr-empty-desc">Los entregables, contratos y propuestas aparecerán aquí.</p>
            </div>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="docs-grid">
          {filtered.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              onDownload={(e) => handleDownload(e, doc)}
              onPreview={(e) => handlePreview(e, doc)}
              downloading={downloading === doc.id}
            />
          ))}
        </div>
      ) : (
        <div className="docs-list-card">
          <div className="docs-list-head">
            <div></div>
            <div>Documento</div>
            <div>Categoría · Proyecto</div>
            <div>Tamaño</div>
            <div>Fecha</div>
            <div></div>
          </div>
          {filtered.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onDownload={(e) => handleDownload(e, doc)}
              onPreview={(e) => handlePreview(e, doc)}
              onShare={() => showToast('Compartir documento no disponible aún.')}
              downloading={downloading === doc.id}
            />
          ))}
          <div className="docs-mobile-list">
            {filtered.map((doc) => (
              <MobileRow
                key={`m-${doc.id}`}
                doc={doc}
                onDownload={(e) => handleDownload(e, doc)}
                onPreview={(e) => handlePreview(e, doc)}
                downloading={downloading === doc.id}
              />
            ))}
          </div>
        </div>
      )}

      <ToastStack />
    </div>
  )
}

function PageHeader({ onUpload, onDownloadAll }) {
  return (
    <div className="pr-page-header">
      <Link href="/portal" className="pr-page-crumb">
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>
      <div className="pr-page-header-row">
        <div>
          <h1 className="pr-page-title">Documentos</h1>
          <p className="pr-page-sub">
            Todos los archivos compartidos contigo — propuestas, contratos, informes y entregables.
          </p>
        </div>
        {(onUpload || onDownloadAll) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onUpload && (
              <button className="pr-btn ghost sm" onClick={onUpload}>
                <Upload size={14} /> Subir
              </button>
            )}
            {onDownloadAll && (
              <button className="pr-btn primary sm" onClick={onDownloadAll}>
                <Download size={14} /> Descargar todos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, accent, value, label, sub }) {
  return (
    <div className="pr-kpi">
      <div className="pr-kpi-head">
        <div className={`pr-kpi-icon pr-accent-${accent}`}>
          <Icon size={14} />
        </div>
        <div className="pr-kpi-label">{label}</div>
      </div>
      <div className="pr-kpi-value">{value}</div>
      <div className="pr-kpi-sub">{sub}</div>
    </div>
  )
}

function DocCard({ doc, onDownload, onPreview, downloading }) {
  const meta = CATEGORY_META[doc.type] || FALLBACK_CATEGORY
  const rawExt = doc.extension || extractExt(doc.file_name || doc.name) || meta.glyph
  const ext = rawExt.toLowerCase()
  const glyph = rawExt.toUpperCase().slice(0, 4)
  return (
    <div className="docs-card">
      <div className="docs-preview" style={previewStyle(doc)}>
        <div className="docs-preview-glyph" style={glyphStyle(meta)}>
          {glyph}
        </div>
      </div>
      <div className="docs-card-body">
        <div className="docs-card-title" title={doc.file_name || doc.name}>
          {doc.file_name || doc.name || 'Documento sin nombre'}
        </div>
        <div className="docs-card-tags">
          <span className={`pr-badge ${meta.badge}`}>{meta.label}</span>
        </div>
        {doc.project_name && (
          <div className="docs-card-project" title={doc.project_name}>
            <Folder size={11} /> {doc.project_name}
          </div>
        )}
        <div className="docs-card-meta">
          <span className="ext">.{ext} · {formatSize(doc.size_bytes ?? doc.size)}</span>
          <span>{formatDate(doc.uploaded_at || doc.created_at)}</span>
        </div>
        <div className="docs-card-actions">
          <button className="pr-btn ghost sm" onClick={onPreview} type="button">
            <Eye size={12} /> Ver
          </button>
          <button
            className="pr-btn sm docs-btn-download"
            onClick={onDownload}
            disabled={downloading}
            type="button"
          >
            {downloading ? <span className="pr-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : <Download size={12} />}
            Bajar
          </button>
        </div>
      </div>
    </div>
  )
}

function DocRow({ doc, onDownload, onPreview, onShare, downloading }) {
  const meta = CATEGORY_META[doc.type] || FALLBACK_CATEGORY
  const ext = (doc.extension || extractExt(doc.file_name || doc.name) || meta.glyph).toUpperCase().slice(0, 4)
  return (
    <div className="docs-list-row">
      <div className="docs-list-thumb" style={thumbStyle(meta)}>{ext}</div>
      <div className="docs-list-cell-name">
        <div className="docs-list-name" title={doc.file_name || doc.name}>
          {doc.file_name || doc.name || 'Documento sin nombre'}
        </div>
        {doc.uploaded_by && (
          <div className="docs-list-author">Subido por {doc.uploaded_by}</div>
        )}
      </div>
      <div className="docs-list-cell-cat">
        <span className={`pr-badge ${meta.badge}`}>{meta.label}</span>
        {doc.project_name && (
          <div className="docs-list-cell-cat-project" title={doc.project_name}>
            {doc.project_name}
          </div>
        )}
      </div>
      <div className="docs-list-size">{formatSize(doc.size_bytes ?? doc.size)}</div>
      <div className="docs-list-date">{formatDate(doc.uploaded_at || doc.created_at)}</div>
      <div className="docs-list-actions">
        <button className="pr-btn ghost sm icon-only" onClick={onPreview} title="Ver" type="button">
          <Eye size={13} />
        </button>
        <button
          className="pr-btn ghost sm icon-only"
          onClick={onDownload}
          disabled={downloading}
          title="Descargar"
          type="button"
        >
          {downloading ? <span className="pr-spinner" style={{ width: 13, height: 13, borderWidth: 1.5 }} /> : <Download size={13} />}
        </button>
        <button className="pr-btn ghost sm icon-only" onClick={onShare} title="Compartir" type="button">
          <Share2 size={13} />
        </button>
      </div>
    </div>
  )
}

function MobileRow({ doc, onDownload, onPreview, downloading }) {
  const meta = CATEGORY_META[doc.type] || FALLBACK_CATEGORY
  const ext = (doc.extension || extractExt(doc.file_name || doc.name) || meta.glyph).toUpperCase().slice(0, 4)
  return (
    <div className="docs-mobile-row">
      <div className="docs-list-thumb" style={thumbStyle(meta)}>{ext}</div>
      <div className="docs-mobile-body">
        <div className="docs-list-name" title={doc.file_name || doc.name}>
          {doc.file_name || doc.name || 'Documento sin nombre'}
        </div>
        <div className="docs-mobile-meta">
          <span className={`pr-badge ${meta.badge}`}>{meta.label}</span>
          {doc.project_name && <span>{doc.project_name}</span>}
          <span>{formatSize(doc.size_bytes ?? doc.size)}</span>
          <span>{formatDate(doc.uploaded_at || doc.created_at)}</span>
        </div>
      </div>
      <div className="docs-mobile-actions">
        <button className="pr-btn ghost sm icon-only" onClick={onPreview} title="Ver" type="button">
          <Eye size={13} />
        </button>
        <button
          className="pr-btn ghost sm icon-only"
          onClick={onDownload}
          disabled={downloading}
          title="Descargar"
          type="button"
        >
          {downloading ? <span className="pr-spinner" style={{ width: 13, height: 13, borderWidth: 1.5 }} /> : <Download size={13} />}
        </button>
      </div>
    </div>
  )
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
