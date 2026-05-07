import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, File, FolderKanban, Download, LayoutGrid, List, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getAccessToken, BASE_URL } from '../../services/api'

const typeConfig = {
  proposal: { label: 'Propuesta', bg: 'bg-primary/20', text: 'text-primary' },
  contract: { label: 'Contrato', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  report: { label: 'Informe', bg: 'bg-accent/20', text: 'text-accent' },
  deliverable: { label: 'Entregable', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
}

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'proposal', label: 'Propuestas' },
  { key: 'contract', label: 'Contratos' },
  { key: 'report', label: 'Informes' },
  { key: 'deliverable', label: 'Entregables' },
]

function formatSize(bytes) {
  if (bytes >= 1000000) {
    return (bytes / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MB'
  }
  return Math.round(bytes / 1000).toLocaleString('es-ES') + ' KB'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isPdf(mimeType) {
  return mimeType === 'application/pdf'
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedProject, setSelectedProject] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [downloading, setDownloading] = useState(null)

  const { data: documents, loading, error, refetch } = useApi('/client/documents', {
    params: {
      type: activeTab !== 'all' ? activeTab : undefined,
      project_id: selectedProject !== null ? selectedProject : undefined,
    },
  })

  const projects = useMemo(() => {
    if (!documents || !Array.isArray(documents)) return [{ id: null, name: 'Todos los proyectos' }]
    const projectMap = new Map()
    documents.forEach((doc) => {
      if (doc.project_id && doc.project_name) {
        projectMap.set(doc.project_id, doc.project_name)
      }
    })
    return [
      { id: null, name: 'Todos los proyectos' },
      ...Array.from(projectMap, ([id, name]) => ({ id, name })),
    ]
  }, [documents])

  const handleDownload = async (e, doc) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloading(doc.id)
    try {
      const response = await fetch(`${BASE_URL}/client/documents/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Documentos</h1>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Documentos</h1>
        <div className="text-center py-16">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary/80 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const filteredDocuments = documents || []

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white">Documentos</h1>

      <div className="flex flex-col gap-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedProject === null ? '' : selectedProject}
              onChange={(e) => setSelectedProject(e.target.value === '' ? null : Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id ?? 'all'} value={p.id ?? ''} className="bg-surface-dark">
                  {p.name}
                </option>
              ))}
            </select>

            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista cuadrícula"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista lista"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          key={`grid-${activeTab}-${selectedProject}`}
        >
          {filteredDocuments.map((doc) => {
            const typeInfo = typeConfig[doc.type] || { label: doc.type, bg: 'bg-slate-500/20', text: 'text-slate-400' }
            const FileIcon = isPdf(doc.mime_type) ? FileText : File
            return (
              <motion.div
                key={doc.id}
                variants={fadeUp}
                className="bg-surface-dark rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="mb-4">
                  <FileIcon size={40} className="text-primary" />
                </div>

                <h3 className="text-white font-medium truncate mb-2" title={doc.name}>
                  {doc.name}
                </h3>

                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text} mb-3`}>
                  {typeInfo.label}
                </span>

                {doc.project_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                    <FolderKanban size={12} />
                    <span>{doc.project_name}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  <span>{formatSize(doc.size_bytes)}</span>
                  <span>&middot;</span>
                  <span>{formatDate(doc.uploaded_at)}</span>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Subido por {doc.uploaded_by}
                </p>

                <button
                  onClick={(e) => handleDownload(e, doc)}
                  disabled={downloading === doc.id}
                  className="flex items-center gap-2 text-primary hover:text-white transition-colors text-sm cursor-pointer"
                >
                  {downloading === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>Descargar</span>
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {viewMode === 'list' && (
        <motion.div
          className="mt-6 bg-surface-dark rounded-2xl border border-white/5 overflow-hidden"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          key={`list-${activeTab}-${selectedProject}`}
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Proyecto</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Tamaño</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Descargar</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  const typeInfo = typeConfig[doc.type] || { label: doc.type, bg: 'bg-slate-500/20', text: 'text-slate-400' }
                  const FileIcon = isPdf(doc.mime_type) ? FileText : File
                  return (
                    <motion.tr
                      key={doc.id}
                      variants={fadeUp}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileIcon size={20} className="text-primary shrink-0" />
                          <span className="text-white text-sm font-medium truncate max-w-xs" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {doc.project_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 text-right">
                        {formatSize(doc.size_bytes)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatDate(doc.uploaded_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => handleDownload(e, doc)}
                          disabled={downloading === doc.id}
                          className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
                          title="Descargar"
                        >
                          {downloading === doc.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-white/5">
            {filteredDocuments.map((doc) => {
              const typeInfo = typeConfig[doc.type] || { label: doc.type, bg: 'bg-slate-500/20', text: 'text-slate-400' }
              const FileIcon = isPdf(doc.mime_type) ? FileText : File
              return (
                <motion.div
                  key={doc.id}
                  variants={fadeUp}
                  className="p-5"
                >
                  <div className="flex items-start gap-3">
                    <FileIcon size={24} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-sm font-medium truncate">{doc.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                          {typeInfo.label}
                        </span>
                        {doc.project_name && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <FolderKanban size={10} />
                            {doc.project_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{formatSize(doc.size_bytes)}</span>
                        <span>&middot;</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDownload(e, doc)}
                      disabled={downloading === doc.id}
                      className="text-slate-400 hover:text-primary transition-colors shrink-0 cursor-pointer"
                      title="Descargar"
                    >
                      {downloading === doc.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {filteredDocuments.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          No hay documentos en esta categoría.
        </div>
      )}
    </div>
  )
}
