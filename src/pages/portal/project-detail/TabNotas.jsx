import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Trash2, FileText } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import api from '../../../services/api'

const MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function isLocalId(id) {
  return typeof id === 'string' && id.startsWith('local-')
}

function deriveTitle(content) {
  if (!content) return 'Nota sin título'
  const lines = String(content).split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    // Quitamos los marcadores markdown más típicos del primer caracter ('#', '>', '-', '*', ...)
    const cleaned = line.replace(/^#+\s*/, '').replace(/^[->*+]\s+/, '').trim()
    if (cleaned) return cleaned
  }
  return 'Nota sin título'
}

function deriveExcerpt(content) {
  if (!content) return ''
  const lines = String(content).split(/\r?\n/)
  let firstSeen = false
  const collected = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!firstSeen) {
      firstSeen = true
      continue
    }
    collected.push(line)
  }
  if (collected.length === 0) return ''
  // Limpieza básica de markdown crudo (#, **, *, _, `, >, -, links).
  const stripped = collected
    .join(' ')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/^#+\s*/g, '')
    .replace(/^[->*+]\s+/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length <= 80) return stripped
  return stripped.slice(0, 80).trimEnd() + '…'
}

function formatRelativeDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const startOfDay = (date) => {
    const c = new Date(date)
    c.setHours(0, 0, 0, 0)
    return c
  }
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays > 1 && diffDays < 30) return `Hace ${diffDays} días`
  // Fallback a fecha corta "25 oct 2024".
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(d)
      .replace('.', '')
  } catch (_) {
    return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`
  }
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid var(--pr-accent-cyan)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'pd-spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes pd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function TabNotas({ projectId, onShowToast }) {
  const { data, loading, error, refetch } = useApi(
    `/client/projects/${projectId}/notes`,
    { immediate: !!projectId },
  )

  const [notes, setNotes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [showSavedBadge, setShowSavedBadge] = useState(false)

  const saveTimerRef = useRef(null)
  const savingIdsRef = useRef(new Set()) // ids locales con POST en vuelo
  const savedBadgeTimerRef = useRef(null)
  const initialisedRef = useRef(false)

  // Hidratamos el estado local con la respuesta del backend la primera vez que llega.
  useEffect(() => {
    if (!data) return
    if (initialisedRef.current) return
    const payload = data?.data ?? data
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
    setNotes(list)
    setActiveId((prev) => prev ?? list[0]?.id ?? null)
    initialisedRef.current = true
  }, [data])

  // Mostramos el badge "Guardado" durante 2.5s tras cada save exitoso.
  useEffect(() => {
    if (!savedAt) return
    setShowSavedBadge(true)
    clearTimeout(savedBadgeTimerRef.current)
    savedBadgeTimerRef.current = setTimeout(() => setShowSavedBadge(false), 2500)
    return () => clearTimeout(savedBadgeTimerRef.current)
  }, [savedAt])

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const note = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId])

  const persistNote = async (targetId, content) => {
    // Resolvemos contra el estado más reciente: usamos un updater para localizar la nota actual.
    let resolved = null
    setNotes((current) => {
      resolved = current.find((n) => n.id === targetId) || null
      return current
    })
    if (!resolved) return

    try {
      if (isLocalId(targetId)) {
        if (savingIdsRef.current.has(targetId)) return
        savingIdsRef.current.add(targetId)
        const created = await api.post(`/client/projects/${projectId}/notes`, { content })
        const newNote = created?.data ?? created
        setNotes((ns) => ns.map((n) => (n.id === targetId ? { ...newNote, content } : n)))
        setActiveId((prev) => (prev === targetId ? newNote.id : prev))
        savingIdsRef.current.delete(targetId)
      } else {
        const updated = await api.put(`/client/projects/${projectId}/notes/${targetId}`, { content })
        const newNote = updated?.data ?? updated
        if (newNote && newNote.id != null) {
          setNotes((ns) => ns.map((n) => (n.id === targetId ? { ...n, ...newNote } : n)))
        }
      }
      setSavedAt(new Date())
    } catch (err) {
      savingIdsRef.current.delete(targetId)
      const msg = err?.data?.message || err?.message || 'No se pudo guardar la nota'
      onShowToast?.(msg)
    }
  }

  const updateContent = (val) => {
    if (!activeId) return
    const targetId = activeId
    setNotes((ns) => ns.map((n) => (n.id === targetId ? { ...n, content: val } : n)))
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persistNote(targetId, val)
    }, 1500)
  }

  const addNote = () => {
    const id = 'local-' + Date.now()
    const fresh = {
      id,
      content: '# Nueva nota\n\nEscribe aquí...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setNotes((ns) => [fresh, ...ns])
    setActiveId(id)
  }

  const deleteNote = async () => {
    if (!note) return
    if (!window.confirm('¿Eliminar esta nota?')) return

    const targetId = note.id
    const previous = notes
    const remaining = previous.filter((n) => n.id !== targetId)
    setNotes(remaining)
    setActiveId(remaining[0]?.id ?? null)

    if (isLocalId(targetId)) {
      onShowToast?.('Nota eliminada')
      return
    }

    try {
      await api.delete(`/client/projects/${projectId}/notes/${targetId}`)
      onShowToast?.('Nota eliminada')
    } catch (err) {
      // Restauramos el estado si falla el borrado en backend.
      setNotes(previous)
      setActiveId(targetId)
      const msg = err?.data?.message || err?.message || 'No se pudo eliminar la nota'
      onShowToast?.(msg)
    }
  }

  if (loading && !initialisedRef.current) {
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
            borderColor: 'rgba(255, 23, 68,0.35)',
            background: 'rgba(255, 23, 68,0.08)',
          }}
        >
          <p style={{ color: '#FF5C7A', marginBottom: 16, fontSize: 13 }}>{error}</p>
          <button type="button" className="pd-btn pd-btn-ghost pd-sm" onClick={refetch}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="pd-tab-content">
        <div className="pd-section-head">
          <div>
            <h2 className="pd-section-title">Notas privadas</h2>
            <p className="pd-section-sub">Solo tú las ves. Auto-guardado activado.</p>
          </div>
          <div className="pd-section-actions">
            <button type="button" className="pd-btn pd-btn-primary pd-sm" onClick={addNote}>
              <Plus size={13} /> Nueva nota
            </button>
          </div>
        </div>
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><FileText size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Aún no tienes notas</p>
              <p className="pd-empty-state-desc">
                Crea notas privadas para recordar ideas, pendientes o preguntas para tu equipo.
              </p>
            </div>
            <button type="button" className="pd-btn pd-btn-primary pd-sm" onClick={addNote}>
              <Plus size={13} /> Crear mi primera nota
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pd-tab-content">
      <div className="pd-section-head">
        <div>
          <h2 className="pd-section-title">Notas privadas</h2>
          <p className="pd-section-sub">Solo tú las ves. Auto-guardado activado.</p>
        </div>
        <div className="pd-section-actions">
          {showSavedBadge && (
            <span style={{ fontSize: 12, color: 'var(--pd-text-muted)' }}>
              <Check size={12} style={{ display: 'inline', verticalAlign: -1, color: 'var(--pr-accent-green)' }} /> Guardado
            </span>
          )}
          <button type="button" className="pd-btn pd-btn-primary pd-sm" onClick={addNote}>
            <Plus size={13} /> Nueva nota
          </button>
        </div>
      </div>

      <div
        className="pd-card pd-notes-wrap"
        style={{
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          minHeight: 500,
        }}
      >
        <div style={{ borderRight: '1px solid var(--pd-border)', overflow: 'auto', maxHeight: 600 }}>
          {notes.map((n) => {
            const title = deriveTitle(n.content)
            const excerpt = deriveExcerpt(n.content)
            const date = formatRelativeDate(n.updated_at || n.created_at)
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setActiveId(n.id)}
                style={{
                  width: '100%',
                  padding: 16,
                  borderBottom: '1px solid var(--pd-border)',
                  background: n.id === activeId ? 'rgba(0, 229, 255,0.08)' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 200ms',
                  border: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--pd-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 6,
                  }}
                >
                  {excerpt}
                </div>
                <div style={{ fontSize: 10, color: 'var(--pd-text-faint)' }}>{date}</div>
              </button>
            )
          })}
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={note?.content || ''}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="# Título…"
            style={{
              flex: 1,
              minHeight: 460,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--pd-text-primary)',
              fontSize: 14,
              lineHeight: 1.7,
              fontFamily: 'var(--pr-font-mono)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid var(--pd-border)',
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--pd-text-muted)' }}>
              Markdown soportado · {note?.content?.length || 0} caracteres
            </span>
            <button
              type="button"
              className="pd-btn pd-icon-only pd-btn-ghost pd-sm"
              title="Eliminar nota"
              onClick={deleteNote}
              disabled={!note}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
