import { useEffect, useMemo, useRef, useState } from 'react'
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
  Palette,
  Code2,
  Video,
  File as FileIcon,
  Edit3,
  Trash2,
  X,
  Plus,
} from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { api, getAccessToken, BASE_URL } from '../../services/api'
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
  design: {
    label: 'Diseño',
    badge: 'purple',
    accent: 'purple',
    glyph: 'FIG',
    color: '#f0abfc',
  },
  code: {
    label: 'Código',
    badge: 'cyan',
    accent: 'cyan',
    glyph: 'CODE',
    color: '#22d3ee',
  },
  video: {
    label: 'Vídeo',
    badge: 'red',
    accent: 'red',
    glyph: 'MP4',
    color: '#f87171',
  },
  image: {
    label: 'Imagen',
    badge: 'amber',
    accent: 'amber',
    glyph: 'IMG',
    color: '#fbbf24',
  },
  other: {
    label: 'Otro',
    badge: 'gray',
    accent: 'gray',
    glyph: 'FILE',
    color: '#cbd5e1',
  },
}

const FALLBACK_CATEGORY = {
  label: 'Otro',
  badge: 'gray',
  accent: 'gray',
  glyph: 'DOC',
  color: '#cbd5e1',
}

const TYPE_OPTIONS = [
  { value: 'proposal', label: 'Propuesta' },
  { value: 'contract', label: 'Contrato' },
  { value: 'report', label: 'Informe' },
  { value: 'deliverable', label: 'Entregable' },
  { value: 'design', label: 'Diseño' },
  { value: 'code', label: 'Código' },
  { value: 'video', label: 'Vídeo' },
  { value: 'image', label: 'Imagen' },
  { value: 'other', label: 'Otro' },
]

// Iconos lucide por tipo (basado en type del backend, fallback a mime/ext)
function getFileIcon(doc) {
  const t = doc.type
  if (t === 'design') return Palette
  if (t === 'code') return Code2
  if (t === 'video') return Video
  if (t === 'image') return ImageIcon
  const mime = (doc.mime_type || '').toLowerCase()
  const ext = (doc.extension || extractExt(doc.file_name || doc.name) || '').toLowerCase()
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return ImageIcon
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi'].includes(ext)) return Video
  if (mime === 'application/pdf' || ext === 'pdf') return FileText
  if (t === 'other') return FileIcon
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

// Hue determinista por id/nombre (fallback si backend no manda cover_hue)
function hueFor(seed) {
  let str = String(seed ?? '')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

function previewStyle(doc) {
  const h = doc.cover_hue != null ? Number(doc.cover_hue) : hueFor(doc.id ?? doc.file_name ?? doc.name)
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

// Debounce hook simple
function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [project, setProject] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const [downloading, setDownloading] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [shareDoc, setShareDoc] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const { showToast, ToastStack } = useToasts()

  const debouncedQuery = useDebounced(query, 350)

  const { data, loading, error, refetch } = useApi('/client/documents', {
    params: {
      type: activeTab !== 'all' ? activeTab : undefined,
      project_id: project !== 'all' ? project : undefined,
      q: debouncedQuery.trim() || undefined,
    },
  })

  // Lista de proyectos para selects (modal upload + filtro)
  const { data: projectsData } = useApi('/client/projects')

  const documents = useMemo(() => {
    if (!data) return []
    return Array.isArray(data) ? data : (data?.data ?? [])
  }, [data])

  const projects = useMemo(() => {
    const list = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? [])
    if (list && list.length) {
      return list.map((p) => ({ id: String(p.id ?? p.project_id ?? ''), name: p.name || p.title || `Proyecto ${p.id}` }))
    }
    // Fallback: derivar de los docs cargados
    const set = new Map()
    documents.forEach((d) => {
      if (d.project_id != null && d.project_name) {
        set.set(String(d.project_id), d.project_name)
      } else if (d.project_name) {
        set.set(d.project_name, d.project_name)
      }
    })
    return Array.from(set, ([id, name]) => ({ id, name }))
  }, [projectsData, documents])

  // Conteos por categoría (sobre el dataset crudo del tab "all" se haría con otra petición;
  // aquí mostramos counts del dataset actual — KISS, no se duplica request).
  const counts = useMemo(() => {
    const c = {
      all: documents.length,
      proposal: 0, contract: 0, report: 0, deliverable: 0,
      design: 0, code: 0, video: 0, image: 0, other: 0,
    }
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
    { key: 'design', label: 'Diseño', count: counts.design },
    { key: 'code', label: 'Código', count: counts.code },
    { key: 'video', label: 'Vídeo', count: counts.video },
    { key: 'image', label: 'Imagen', count: counts.image },
    { key: 'other', label: 'Otro', count: counts.other },
  ]

  // Limpia selección al cambiar filtros / tab para evitar IDs huérfanos
  useEffect(() => {
    setSelected(new Set())
  }, [activeTab, project, debouncedQuery])

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelected = () => setSelected(new Set())

  const handleDownload = async (e, doc) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
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

  const handleBulkDownload = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    setBulkDownloading(true)
    showToast(`Generando ZIP con ${ids.length} archivo${ids.length === 1 ? '' : 's'}…`)
    try {
      const response = await fetch(`${BASE_URL}/client/documents/zip?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      if (!response.ok) throw new Error('zip fail')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `documentos-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      window.URL.revokeObjectURL(url)
      clearSelected()
    } catch {
      showToast('No se pudo generar el ZIP')
    } finally {
      setBulkDownloading(false)
    }
  }

  const openPreview = async (e, doc) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    setPreviewDoc({ doc, loading: true, url: null, mime: null })
    try {
      const response = await fetch(`${BASE_URL}/client/documents/${doc.id}/preview`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      })
      if (!response.ok) throw new Error('preview fail')
      const mime = response.headers.get('Content-Type') || ''
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewDoc({ doc, loading: false, url, mime })
    } catch {
      setPreviewDoc(null)
      showToast('No se pudo abrir el preview')
    }
  }

  const closePreview = () => {
    if (previewDoc?.url) window.URL.revokeObjectURL(previewDoc.url)
    setPreviewDoc(null)
  }

  const handleDelete = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.file_name || doc.name || 'documento'}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/client/documents/${doc.id}`)
      showToast('Documento eliminado')
      refetch()
    } catch {
      showToast('No se pudo eliminar el documento')
    }
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

  const hasSelection = selected.size > 0

  return (
    <div>
      <PageHeader
        onUpload={() => setUploadOpen(true)}
        onDownloadAll={null}
      />

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

      {/* Selection bar */}
      {hasSelection && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--pr-purple-bg)',
            border: '1px solid var(--pr-purple-border)',
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--pr-text-primary)' }}>
            <strong>{selected.size}</strong> seleccionado{selected.size === 1 ? '' : 's'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pr-btn ghost sm" onClick={clearSelected} type="button">
              <X size={13} /> Limpiar
            </button>
            <button
              className="pr-btn primary sm"
              onClick={handleBulkDownload}
              type="button"
              disabled={bulkDownloading}
            >
              {bulkDownloading
                ? <span className="pr-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                : <Download size={13} />}
              Descargar selección
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {documents.length === 0 ? (
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
          {documents.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              selected={selected.has(doc.id)}
              onToggleSelect={() => toggleSelected(doc.id)}
              onDownload={(e) => handleDownload(e, doc)}
              onPreview={(e) => openPreview(e, doc)}
              onShare={() => setShareDoc(doc)}
              onEdit={() => setEditDoc(doc)}
              onDelete={() => handleDelete(doc)}
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
          {documents.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              selected={selected.has(doc.id)}
              onToggleSelect={() => toggleSelected(doc.id)}
              onDownload={(e) => handleDownload(e, doc)}
              onPreview={(e) => openPreview(e, doc)}
              onShare={() => setShareDoc(doc)}
              onEdit={() => setEditDoc(doc)}
              onDelete={() => handleDelete(doc)}
              downloading={downloading === doc.id}
            />
          ))}
          <div className="docs-mobile-list">
            {documents.map((doc) => (
              <MobileRow
                key={`m-${doc.id}`}
                doc={doc}
                selected={selected.has(doc.id)}
                onToggleSelect={() => toggleSelected(doc.id)}
                onDownload={(e) => handleDownload(e, doc)}
                onPreview={(e) => openPreview(e, doc)}
                downloading={downloading === doc.id}
              />
            ))}
          </div>
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          projects={projects}
          defaultProjectId={project !== 'all' ? project : ''}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false)
            showToast('Documento subido')
            refetch()
          }}
          onError={(msg) => showToast(msg || 'No se pudo subir el documento')}
        />
      )}

      {editDoc && (
        <EditModal
          doc={editDoc}
          projects={projects}
          onClose={() => setEditDoc(null)}
          onSaved={() => {
            setEditDoc(null)
            showToast('Documento actualizado')
            refetch()
          }}
          onError={(msg) => showToast(msg || 'No se pudo actualizar')}
        />
      )}

      {shareDoc && (
        <ShareModal
          doc={shareDoc}
          onClose={() => setShareDoc(null)}
          onShared={() => {
            setShareDoc(null)
            showToast('Documento compartido')
            refetch()
          }}
          onError={(msg) => showToast(msg || 'No se pudo compartir')}
        />
      )}

      {previewDoc && (
        <PreviewModal entry={previewDoc} onClose={closePreview} />
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
              <button className="pr-btn primary sm" onClick={onUpload}>
                <Upload size={14} /> Subir
              </button>
            )}
            {onDownloadAll && (
              <button className="pr-btn ghost sm" onClick={onDownloadAll}>
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

function DocCard({ doc, selected, onToggleSelect, onDownload, onPreview, onShare, onEdit, onDelete, downloading }) {
  const meta = CATEGORY_META[doc.type] || FALLBACK_CATEGORY
  const FileGlyph = getFileIcon(doc)
  const rawExt = doc.extension || extractExt(doc.file_name || doc.name) || meta.glyph
  const ext = rawExt.toLowerCase()
  const glyph = rawExt.toUpperCase().slice(0, 4)
  const canDelete = doc.is_client_upload === true
  return (
    <div className="docs-card" style={selected ? { borderColor: 'var(--pr-accent-purple)', boxShadow: 'var(--pr-glow-purple)' } : undefined}>
      <div className="docs-preview" style={previewStyle(doc)}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          aria-label={selected ? 'Quitar selección' : 'Seleccionar'}
          style={{
            position: 'absolute', top: 8, left: 8, zIndex: 2,
            width: 22, height: 22, borderRadius: 6,
            background: selected ? 'var(--pr-accent-purple)' : 'rgba(0,0,0,0.55)',
            border: '1px solid ' + (selected ? 'var(--pr-accent-purple)' : 'rgba(255,255,255,0.3)'),
            color: 'white', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}
        >
          {selected ? <Check size={13} /> : null}
        </button>
        <div className="docs-preview-glyph" style={glyphStyle(meta)}>
          <FileGlyph size={11} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {glyph}
        </div>
      </div>
      <div className="docs-card-body">
        <div className="docs-card-title" title={doc.file_name || doc.name}>
          {doc.file_name || doc.name || 'Documento sin nombre'}
        </div>
        <div className="docs-card-tags">
          <span className={`pr-badge ${meta.badge}`}>{meta.label}</span>
          {doc.folder && (
            <span className="pr-badge gray" title={`Carpeta: ${doc.folder}`}>
              <Folder size={10} style={{ marginRight: 4 }} /> {doc.folder}
            </span>
          )}
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
          <button className="pr-btn ghost sm" onClick={onPreview} type="button" title="Ver">
            <Eye size={12} /> Ver
          </button>
          <button
            className="pr-btn sm docs-btn-download"
            onClick={onDownload}
            disabled={downloading}
            type="button"
            title="Descargar"
          >
            {downloading ? <span className="pr-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : <Download size={12} />}
            Bajar
          </button>
          <button className="pr-btn ghost sm icon-only" onClick={onShare} type="button" title="Compartir">
            <Share2 size={12} />
          </button>
          <button className="pr-btn ghost sm icon-only" onClick={onEdit} type="button" title="Editar">
            <Edit3 size={12} />
          </button>
          {canDelete && (
            <button className="pr-btn ghost sm icon-only" onClick={onDelete} type="button" title="Eliminar" style={{ color: '#f87171' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DocRow({ doc, selected, onToggleSelect, onDownload, onPreview, onShare, onEdit, onDelete, downloading }) {
  const meta = CATEGORY_META[doc.type] || FALLBACK_CATEGORY
  const ext = (doc.extension || extractExt(doc.file_name || doc.name) || meta.glyph).toUpperCase().slice(0, 4)
  const canDelete = doc.is_client_upload === true
  return (
    <div className="docs-list-row">
      <div className="docs-list-thumb" style={thumbStyle(meta)}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          aria-label={selected ? 'Quitar selección' : 'Seleccionar'}
          style={{
            position: 'absolute', inset: 0,
            background: selected ? 'rgba(168, 85, 247, 0.6)' : 'transparent',
            border: 'none', borderRadius: 'inherit',
            color: 'white', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            fontSize: 11, fontWeight: 700,
          }}
        >
          {selected ? <Check size={14} /> : ext}
        </button>
      </div>
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
        <button className="pr-btn ghost sm icon-only" onClick={onEdit} title="Editar" type="button">
          <Edit3 size={13} />
        </button>
        {canDelete && (
          <button className="pr-btn ghost sm icon-only" onClick={onDelete} title="Eliminar" type="button" style={{ color: '#f87171' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function MobileRow({ doc, selected, onToggleSelect, onDownload, onPreview, downloading }) {
  const meta = CATEGORY_META[doc.type] || FALLBACK_CATEGORY
  const ext = (doc.extension || extractExt(doc.file_name || doc.name) || meta.glyph).toUpperCase().slice(0, 4)
  return (
    <div className="docs-mobile-row">
      <div
        className="docs-list-thumb"
        style={{ ...thumbStyle(meta), cursor: 'pointer', position: 'relative' }}
        onClick={onToggleSelect}
      >
        {selected ? <Check size={14} /> : ext}
      </div>
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

/* ====================== Modales inline ====================== */

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 90,
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(8px)',
  display: 'grid',
  placeItems: 'center',
  padding: 16,
}

const modalCardStyle = {
  background: 'var(--pr-bg-card)',
  border: '1px solid var(--pr-border)',
  borderRadius: 14,
  width: '100%',
  maxWidth: 480,
  maxHeight: '90vh',
  overflow: 'auto',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  boxShadow: 'var(--pr-shadow-md)',
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--pr-text-secondary)',
  marginBottom: 6,
  display: 'block',
}

function ModalShell({ title, onClose, children, footer, maxWidth }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ ...modalCardStyle, maxWidth: maxWidth || modalCardStyle.maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pr-text-primary)' }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pr-text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
        {footer && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

function UploadModal({ projects, defaultProjectId, onClose, onUploaded, onError }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('other')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [folder, setFolder] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      onError('Selecciona un archivo')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (name.trim()) fd.append('name', name.trim())
      if (type) fd.append('type', type)
      if (projectId) fd.append('project_id', projectId)
      if (folder.trim()) fd.append('folder', folder.trim())
      if (notes.trim()) fd.append('notes', notes.trim())
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      tags.forEach((tag) => fd.append('tags[]', tag))

      await api.post('/client/documents', fd)
      onUploaded()
    } catch (err) {
      onError(err?.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title="Subir documento"
      onClose={submitting ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="pr-btn ghost sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" form="upload-doc-form" className="pr-btn primary sm" disabled={submitting || !file}>
            {submitting
              ? <span className="pr-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              : <Plus size={13} />}
            Subir
          </button>
        </>
      }
    >
      <form id="upload-doc-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Archivo <span style={{ color: '#f87171' }}>*</span></label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] || null
              setFile(f)
              if (f && !name.trim()) setName(f.name)
            }}
            className="pr-input"
            style={{ padding: 8 }}
          />
        </div>
        <div>
          <label style={labelStyle}>Nombre (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi documento"
            className="pr-input"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select className="pr-select" value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%' }}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Proyecto</label>
            <select
              className="pr-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Carpeta</label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="entregables/v1"
              className="pr-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Tags (coma)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="diseño, v2, urgente"
              className="pr-input"
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comentario opcional para el equipo…"
            rows={3}
            className="pr-input"
            style={{ resize: 'vertical', minHeight: 70 }}
          />
        </div>
      </form>
    </ModalShell>
  )
}

function EditModal({ doc, projects, onClose, onSaved, onError }) {
  const [name, setName] = useState(doc.file_name || doc.name || '')
  const [type, setType] = useState(doc.type || 'other')
  const [folder, setFolder] = useState(doc.folder || '')
  const [projectId, setProjectId] = useState(doc.project_id != null ? String(doc.project_id) : '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim() || null,
        type,
        folder: folder.trim() || null,
        project_id: projectId ? projectId : null,
      }
      await api.patch(`/client/documents/${doc.id}`, payload)
      onSaved()
    } catch (err) {
      onError(err?.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title="Editar documento"
      onClose={submitting ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="pr-btn ghost sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" form="edit-doc-form" className="pr-btn primary sm" disabled={submitting}>
            {submitting
              ? <span className="pr-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              : <Check size={13} />}
            Guardar
          </button>
        </>
      }
    >
      <form id="edit-doc-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pr-input"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select className="pr-select" value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%' }}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Proyecto</label>
            <select
              className="pr-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Carpeta</label>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="entregables/v1"
            className="pr-input"
          />
        </div>
      </form>
    </ModalShell>
  )
}

function ShareModal({ doc, onClose, onShared, onError }) {
  const [emailsInput, setEmailsInput] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const parsedEmails = useMemo(() => {
    return emailsInput
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean)
  }, [emailsInput])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!parsedEmails.length) {
      onError('Indica al menos un email')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/client/documents/${doc.id}/share`, {
        emails: parsedEmails,
        note: note.trim() || undefined,
      })
      onShared()
    } catch (err) {
      onError(err?.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title="Compartir documento"
      onClose={submitting ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="pr-btn ghost sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            form="share-doc-form"
            className="pr-btn primary sm"
            disabled={submitting || !parsedEmails.length}
          >
            {submitting
              ? <span className="pr-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              : <Share2 size={13} />}
            Enviar
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: 'var(--pr-text-muted)' }}>
        Enviarás <strong>{doc.file_name || doc.name}</strong> a las personas indicadas.
      </div>
      <form id="share-doc-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Emails (separados por coma o salto de línea)</label>
          <textarea
            value={emailsInput}
            onChange={(e) => setEmailsInput(e.target.value)}
            placeholder="ana@empresa.com, luis@empresa.com"
            rows={3}
            className="pr-input"
            style={{ resize: 'vertical', minHeight: 70 }}
          />
          {parsedEmails.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--pr-text-muted)', marginTop: 6 }}>
              {parsedEmails.length} destinatario{parsedEmails.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Nota (opcional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mensaje para el destinatario…"
            rows={3}
            className="pr-input"
            style={{ resize: 'vertical', minHeight: 70 }}
          />
        </div>
      </form>
    </ModalShell>
  )
}

function PreviewModal({ entry, onClose }) {
  const { doc, loading, url, mime } = entry
  const isImage = mime?.startsWith('image/')
  const isPdf = mime === 'application/pdf'
  return (
    <ModalShell
      title={doc.file_name || doc.name || 'Preview'}
      onClose={onClose}
      maxWidth={900}
      footer={
        <>
          {url && (
            <a
              href={url}
              download={doc.file_name || doc.name || `documento-${doc.id}`}
              className="pr-btn ghost sm"
            >
              <Download size={13} /> Descargar
            </a>
          )}
          <button type="button" className="pr-btn primary sm" onClick={onClose}>
            <Check size={13} /> Cerrar
          </button>
        </>
      }
    >
      <div style={{ minHeight: 320, display: 'grid', placeItems: 'center', background: 'var(--pr-bg-input)', borderRadius: 10, padding: 8 }}>
        {loading && <span className="pr-spinner" />}
        {!loading && url && isImage && (
          <img
            src={url}
            alt={doc.file_name || doc.name || ''}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
          />
        )}
        {!loading && url && isPdf && (
          <iframe
            title="preview"
            src={url}
            style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8, background: '#fff' }}
          />
        )}
        {!loading && url && !isImage && !isPdf && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--pr-text-muted)' }}>
            <FileIcon size={32} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13, marginBottom: 4 }}>Vista previa no disponible para este tipo</p>
            <p style={{ fontSize: 11 }}>Descarga el archivo para verlo.</p>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
