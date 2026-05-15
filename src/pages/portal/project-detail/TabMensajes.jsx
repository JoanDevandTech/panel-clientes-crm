import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Plus, Check, MoreHorizontal, Paperclip, Send, MessageSquare, X } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import api, { apiRequest } from '../../../services/api'

const DAY_MS = 24 * 60 * 60 * 1000

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDays = Math.round((startOfToday - startOfDate) / DAY_MS)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  if (diffDays === 0) return `Hoy · ${time}`
  if (diffDays === 1) return `Ayer · ${time}`
  if (diffDays > 1 && diffDays < 7) {
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return `${weekdays[date.getDay()]} · ${time}`
  }
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${pad(date.getDate())} ${months[date.getMonth()]} · ${time}`
}

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function buildThreadTitle(message) {
  if (!message) return 'Conversación'
  const body = (message.body || '').replace(/\s+/g, ' ').trim()
  if (!body) return 'Conversación'
  return body.length > 50 ? `${body.slice(0, 50)}…` : body
}

function authorInitials(author) {
  if (!author?.name) return '?'
  const parts = author.name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

function buildThreads(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return []
  const sorted = [...messages].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime()
    const bTime = new Date(b.created_at || 0).getTime()
    return aTime - bTime
  })
  const map = new Map()
  for (const msg of sorted) {
    if (msg.parent_id == null) {
      map.set(msg.id, { root: msg, messages: [msg] })
    }
  }
  for (const msg of sorted) {
    if (msg.parent_id != null) {
      const thread = map.get(msg.parent_id)
      if (thread) {
        thread.messages.push(msg)
      } else {
        // Si no encontramos el padre, lo tratamos como hilo raíz independiente.
        map.set(msg.id, { root: msg, messages: [msg] })
      }
    }
  }
  return Array.from(map.values()).map((t) => {
    const lastMessage = t.messages[t.messages.length - 1]
    const participants = new Set()
    let unread = 0
    for (const m of t.messages) {
      if (m.author?.id != null) participants.add(m.author.id)
      if (!m.read_at && m.author?.is_staff) unread += 1
    }
    return {
      id: t.root.id,
      root: t.root,
      messages: t.messages,
      title: buildThreadTitle(t.root),
      lastBody: (lastMessage?.body || '').replace(/\s+/g, ' ').trim(),
      lastTime: lastMessage?.created_at,
      participantsCount: participants.size,
      unread,
      isResolved: !!t.root.is_resolved,
    }
  }).sort((a, b) => {
    const aTime = new Date(a.lastTime || 0).getTime()
    const bTime = new Date(b.lastTime || 0).getTime()
    return bTime - aTime
  })
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

export default function TabMensajes({ projectId, onShowToast }) {
  const { data, loading, error, refetch } = useApi(
    `/client/projects/${projectId}/messages`,
    { immediate: !!projectId, params: { per_page: 100 } },
  )

  const [activeThreadId, setActiveThreadId] = useState(null)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState([])
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const markedReadRef = useRef(false)

  // Marcar todos como leídos al montar
  useEffect(() => {
    if (!projectId || markedReadRef.current) return
    markedReadRef.current = true
    api.post(`/client/projects/${projectId}/messages/mark-read`, {}).catch(() => {
      // silencioso
    })
  }, [projectId])

  const messages = useMemo(() => {
    const payload = data?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  }, [data])

  const threads = useMemo(() => buildThreads(messages), [messages])

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true
      const rootBody = (t.root?.body || '').toLowerCase()
      return rootBody.includes(q)
    })
  }, [threads, search])

  // Selección automática del primer hilo
  useEffect(() => {
    if (creatingNew) return
    if (threads.length === 0) {
      if (activeThreadId !== null) setActiveThreadId(null)
      return
    }
    if (activeThreadId == null || !threads.find((t) => t.id === activeThreadId)) {
      setActiveThreadId(threads[0].id)
    }
  }, [threads, activeThreadId, creatingNew])

  const activeThread = threads.find((t) => t.id === activeThreadId) || null

  // Auto-scroll al final cuando cambia el hilo activo o llegan mensajes nuevos
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeThreadId, activeThread?.messages?.length])

  const handleAddFiles = (event) => {
    const list = Array.from(event.target.files || [])
    if (list.length === 0) return
    setFiles((prev) => [...prev, ...list])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const focusComposer = () => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleStartNewThread = () => {
    setCreatingNew(true)
    setActiveThreadId(null)
    setDraft('')
    setFiles([])
    focusComposer()
  }

  const handleCancelNewThread = () => {
    setCreatingNew(false)
    setDraft('')
    setFiles([])
    if (threads.length > 0) {
      setActiveThreadId(threads[0].id)
    }
  }

  const handleSend = async () => {
    const body = draft.trim()
    if ((!body && files.length === 0) || sending) return
    if (!creatingNew && !activeThread) return

    setSending(true)
    try {
      const formData = new FormData()
      formData.append('body', body)
      if (!creatingNew && activeThread) {
        formData.append('parent_id', String(activeThread.root.id))
      }
      files.forEach((f) => formData.append('attachments[]', f))

      const response = await api.post(`/client/projects/${projectId}/messages`, formData)
      const created = response?.data ?? response

      setDraft('')
      setFiles([])

      await refetch()

      if (creatingNew && created?.id != null) {
        setCreatingNew(false)
        setActiveThreadId(created.id)
      } else {
        setCreatingNew(false)
      }
    } catch (err) {
      onShowToast?.(err?.message || 'No se pudo enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async () => {
    if (!activeThread || resolving) return
    setResolving(true)
    try {
      await apiRequest(
        `/client/projects/${projectId}/messages/${activeThread.root.id}/resolve`,
        { method: 'PATCH' },
      )
      onShowToast?.('Hilo marcado como resuelto')
      await refetch()
    } catch (err) {
      onShowToast?.(err?.message || 'No se pudo marcar como resuelto')
    } finally {
      setResolving(false)
    }
  }

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

  if (threads.length === 0 && !creatingNew) {
    return (
      <div className="pd-tab-content">
        <div className="pd-section-head">
          <div>
            <h2 className="pd-section-title">Mensajes</h2>
            <p className="pd-section-sub">
              Conversación informal con tu equipo. Para incidencias formales usa Tickets.
            </p>
          </div>
          <div className="pd-section-actions">
            <button
              type="button"
              className="pd-btn pd-btn-primary pd-sm"
              onClick={handleStartNewThread}
            >
              <Plus size={13} /> Nuevo hilo
            </button>
          </div>
        </div>
        <div className="pd-card">
          <div className="pd-empty-state">
            <div className="pd-empty-state-art"><MessageSquare size={36} /></div>
            <div>
              <p className="pd-empty-state-title">Inicia una conversación sobre tu proyecto</p>
              <p className="pd-empty-state-desc">
                Usa este espacio para charlas rápidas con el equipo. Sin formularios.
              </p>
            </div>
            <button
              type="button"
              className="pd-btn pd-btn-primary pd-sm"
              onClick={handleStartNewThread}
            >
              <Plus size={13} /> Nuevo hilo
            </button>
          </div>
        </div>
      </div>
    )
  }

  const conversationMessages = activeThread?.messages ?? []
  const headerTitle = creatingNew
    ? 'Nuevo hilo'
    : activeThread?.title || 'Conversación'
  const headerSub = creatingNew
    ? 'Escribe el primer mensaje para crear el hilo'
    : `${conversationMessages.length} ${conversationMessages.length === 1 ? 'mensaje' : 'mensajes'}${
        activeThread?.participantsCount
          ? ` · ${activeThread.participantsCount} ${activeThread.participantsCount === 1 ? 'participante' : 'participantes'}`
          : ''
      }`

  const sendDisabled = sending || (!draft.trim() && files.length === 0) || (!creatingNew && !activeThread)

  return (
    <div className="pd-tab-content">
      <div className="pd-section-head">
        <div>
          <h2 className="pd-section-title">Mensajes</h2>
          <p className="pd-section-sub">
            Conversación informal con tu equipo. Para incidencias formales usa Tickets.
          </p>
        </div>
        <div className="pd-section-actions">
          <button
            type="button"
            className="pd-btn pd-btn-primary pd-sm"
            onClick={handleStartNewThread}
            disabled={creatingNew}
          >
            <Plus size={13} /> Nuevo hilo
          </button>
        </div>
      </div>

      <div
        className="pd-card pd-messages-wrap"
        style={{
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          minHeight: 540,
        }}
      >
        <div style={{ borderRight: '1px solid var(--pd-border)', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--pd-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={14} style={{ color: 'var(--pd-text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--pd-text-primary)',
              }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {creatingNew && (
              <button
                type="button"
                onClick={() => {}}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--pd-border)',
                  background: 'rgba(168,85,247,0.08)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'default',
                  position: 'relative',
                  border: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 14,
                    bottom: 14,
                    width: 3,
                    background: 'linear-gradient(180deg, var(--pd-purple), var(--pd-cyan))',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Nuevo hilo</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--pd-text-muted)' }}>
                  Escribe abajo para crear
                </div>
              </button>
            )}
            {filteredThreads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setCreatingNew(false)
                  setActiveThreadId(t.id)
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--pd-border)',
                  background: t.id === activeThreadId && !creatingNew ? 'rgba(168,85,247,0.08)' : 'transparent',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'background 200ms',
                  position: 'relative',
                  border: 'none',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (t.id !== activeThreadId || creatingNew) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (t.id !== activeThreadId || creatingNew) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {t.id === activeThreadId && !creatingNew && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 14,
                      bottom: 14,
                      width: 3,
                      background: 'linear-gradient(180deg, var(--pd-purple), var(--pd-cyan))',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {t.title}
                  </span>
                  {t.unread > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        background: 'var(--pd-red)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 999,
                        minWidth: 18,
                        textAlign: 'center',
                      }}
                    >
                      {t.unread}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--pd-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.lastBody || 'Sin contenido'}
                </div>
              </button>
            ))}
            {!creatingNew && filteredThreads.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--pd-text-muted)', textAlign: 'center' }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--pd-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {headerTitle}
              </div>
              <div style={{ fontSize: 11, color: 'var(--pd-text-muted)' }}>{headerSub}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {creatingNew ? (
                <button
                  type="button"
                  className="pd-btn pd-btn-ghost pd-sm"
                  onClick={handleCancelNewThread}
                >
                  <X size={12} /> Cancelar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="pd-btn pd-btn-ghost pd-sm"
                    onClick={handleResolve}
                    disabled={!activeThread || resolving || activeThread?.isResolved}
                  >
                    <Check size={12} /> {activeThread?.isResolved ? 'Resuelto' : 'Resolver'}
                  </button>
                  <button type="button" className="pd-btn pd-icon-only pd-btn-ghost pd-sm">
                    <MoreHorizontal size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              maxHeight: 500,
            }}
          >
            {creatingNew && (
              <div style={{ textAlign: 'center', color: 'var(--pd-text-muted)', fontSize: 13, padding: '32px 0' }}>
                Escribe el primer mensaje para iniciar el hilo.
              </div>
            )}
            {!creatingNew && conversationMessages.map((m) => {
              const isClient = m.author?.is_staff === false
              const initials = authorInitials(m.author)
              const attachments = Array.isArray(m.attachments) ? m.attachments : []
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexDirection: isClient ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isClient
                        ? 'linear-gradient(135deg,#a855f7,#06b6d4)'
                        : 'linear-gradient(135deg,#94a3b8,#64748b)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'white',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {m.author?.avatar_url ? (
                      <img
                        src={m.author.avatar_url}
                        alt={m.author?.name || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div
                    style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      alignItems: isClient ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--pd-text-muted)' }}>
                      <strong style={{ color: 'var(--pd-text-secondary)', fontWeight: 500 }}>
                        {m.author?.name || 'Usuario'}
                      </strong>{' '}
                      · {formatTimestamp(m.created_at)}
                    </div>
                    {m.body && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: isClient ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          background: isClient
                            ? 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(168,85,247,0.10))'
                            : 'rgba(255,255,255,0.05)',
                          border: isClient ? '1px solid rgba(168,85,247,0.25)' : '1px solid var(--pd-border)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: 'var(--pd-text-primary)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.body}
                      </div>
                    )}
                    {attachments.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          justifyContent: isClient ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1px solid var(--pd-border)',
                              background: 'rgba(255,255,255,0.04)',
                              color: 'var(--pd-text-primary)',
                              fontSize: 12,
                              textDecoration: 'none',
                              maxWidth: 240,
                            }}
                          >
                            <Paperclip size={12} style={{ flexShrink: 0, color: 'var(--pd-text-muted)' }} />
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {att.file_name}
                            </span>
                            {att.file_size != null && (
                              <span style={{ color: 'var(--pd-text-muted)', flexShrink: 0 }}>
                                {formatFileSize(att.file_size)}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--pd-border)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {files.map((f, idx) => (
                  <span
                    key={`${f.name}-${idx}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--pd-border)',
                      background: 'var(--pd-bg-input)',
                      fontSize: 11,
                      color: 'var(--pd-text-secondary)',
                      maxWidth: 220,
                    }}
                  >
                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.name}
                    </span>
                    <span style={{ color: 'var(--pd-text-muted)', flexShrink: 0 }}>
                      {formatFileSize(f.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--pd-text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      aria-label="Quitar archivo"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={handleAddFiles}
              />
              <button
                type="button"
                className="pd-btn pd-icon-only pd-btn-ghost"
                title="Adjuntar"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
              >
                <Paperclip size={15} />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={creatingNew ? 'Escribe el primer mensaje del hilo…' : 'Escribe un mensaje…'}
                disabled={sending}
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'var(--pd-bg-input)',
                  border: '1px solid var(--pd-border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  outline: 'none',
                  color: 'var(--pd-text-primary)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                className="pd-btn pd-btn-primary"
                onClick={handleSend}
                disabled={sendDisabled}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
