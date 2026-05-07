import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, Send, Loader2, Paperclip, X as XIcon, Download, FileText } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import api, { getAccessToken, BASE_URL } from '../../services/api'

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function downloadAttachment(ticketId, attachment) {
  const response = await fetch(`${BASE_URL}/client/tickets/${ticketId}/attachments/${attachment.id}`, {
    headers: { 'Authorization': `Bearer ${getAccessToken()}` }
  })
  if (!response.ok) throw new Error('No se pudo descargar el adjunto.')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = attachment.file_name || attachment.name || 'archivo'
  a.click()
  window.URL.revokeObjectURL(url)
}

const statusConfig = {
  open: { label: 'Abierto', bg: 'bg-primary/20', text: 'text-primary' },
  in_progress: { label: 'En Progreso', bg: 'bg-accent/20', text: 'text-accent' },
  waiting_client: { label: 'Esperando Respuesta', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  resolved: { label: 'Resuelto', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  closed: { label: 'Cerrado', bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

const priorityConfig = {
  low: { label: 'Baja', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  medium: { label: 'Media', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  high: { label: 'Alta', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  urgent: { label: 'Urgente', bg: 'bg-red-500/20', text: 'text-red-400' },
}

function getRelativeDate(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Hace 1 día'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`
  }
  const months = Math.floor(diffDays / 30)
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function TicketDetailPage() {
  const [, params] = useRoute('/portal/tickets/:id')
  const ticketId = params?.id

  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState(null)
  const [replyFiles, setReplyFiles] = useState([])
  const [downloadingId, setDownloadingId] = useState(null)

  const handleReplyFilesChange = (e) => {
    const selected = Array.from(e.target.files || [])
    const total = replyFiles.length + selected.length
    if (total > 5) {
      setReplyError('Máximo 5 archivos por respuesta.')
      return
    }
    const oversized = selected.find((f) => f.size > 10 * 1024 * 1024)
    if (oversized) {
      setReplyError(`"${oversized.name}" supera los 10 MB.`)
      return
    }
    setReplyError(null)
    setReplyFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const removeReplyFile = (idx) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDownload = async (attachment) => {
    if (downloadingId) return
    setDownloadingId(attachment.id)
    try {
      await downloadAttachment(ticketId, attachment)
    } catch {
      // silently fail
    } finally {
      setDownloadingId(null)
    }
  }

  const { data: ticket, loading, error, refetch } = useApi(`/client/tickets/${ticketId}`, {
    immediate: !!ticketId,
  })

  if (loading) {
    return (
      <div>
        <Link
          href="/portal/tickets"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Volver a tickets
        </Link>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link
          href="/portal/tickets"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Volver a tickets
        </Link>
        <div className="text-center py-24">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-5 py-2.5 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div>
        <Link
          href="/portal/tickets"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Volver a tickets
        </Link>
        <div className="text-center py-24 text-slate-500">
          Ticket no encontrado.
        </div>
      </div>
    )
  }

  const status = statusConfig[ticket.status] || statusConfig.open
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium
  const messages = ticket.messages || []

  const canReply = ticket.status !== 'closed' && ticket.status !== 'resolved'

  const handleSendReply = async () => {
    if (!reply.trim() || sendingReply) return
    setSendingReply(true)
    setReplyError(null)
    try {
      const formData = new FormData()
      formData.append('message', reply.trim())
      replyFiles.forEach((f) => formData.append('attachments[]', f))
      await api.post(`/client/tickets/${ticketId}/messages`, formData)
      setReply('')
      setReplyFiles([])
      await refetch()
    } catch (err) {
      setReplyError(err?.data?.message || err?.message || 'Error al enviar la respuesta.')
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div>
      <Link
        href="/portal/tickets"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft size={16} />
        Volver a tickets
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-display font-bold text-white mb-3">{ticket.subject}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
          <span className="text-xs text-slate-500">
            Creado el {formatDate(ticket.created_at)}
          </span>
        </div>
      </motion.div>

      <motion.div
        className="space-y-4 mb-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {messages.map((msg) => {
          const isClient = msg.sender_type === 'client'
          return (
            <motion.div
              key={msg.id}
              variants={fadeUp}
              className={`flex gap-3 ${isClient ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isClient
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {getInitials(msg.sender_name || '??')}
              </div>

              <div
                className={`max-w-[75%] rounded-xl p-4 ${
                  isClient
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-surface-dark border border-white/5'
                }`}
              >
                <p className={`text-sm font-bold mb-1 ${isClient ? 'text-primary' : 'text-white'}`}>
                  {msg.sender_name}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                {(msg.attachments || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                    {msg.attachments.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => handleDownload(att)}
                        disabled={downloadingId === att.id}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-slate-300 hover:text-white disabled:opacity-60"
                      >
                        <FileText size={14} className="text-slate-500 shrink-0" />
                        <span className="flex-1 truncate">{att.name || att.file_name}</span>
                        <span className="text-xs text-slate-500 shrink-0">{formatFileSize(att.size)}</span>
                        {downloadingId === att.id
                          ? <Loader2 size={14} className="animate-spin shrink-0" />
                          : <Download size={14} className="shrink-0" />
                        }
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">{getRelativeDate(msg.created_at)}</p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {canReply && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="border-t border-white/5 pt-6"
        >
          {replyError && (
            <p className="text-sm text-red-400 mb-3">{replyError}</p>
          )}
          <div className="flex gap-3">
            <textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="flex-1 px-4 py-3 rounded-xl bg-background-dark border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white text-sm transition-colors resize-none"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSendReply}
              disabled={!reply.trim() || sendingReply}
              className="self-end px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium transition-all hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </motion.button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer self-start">
              <Paperclip size={14} />
              <span>Adjuntar archivos (máx. 5 · 10 MB c/u)</span>
              <input
                type="file"
                multiple
                onChange={handleReplyFilesChange}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              />
            </label>
            {replyFiles.length > 0 && (
              <ul className="space-y-1">
                {replyFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs">
                    <Paperclip size={12} className="text-slate-500 shrink-0" />
                    <span className="text-slate-300 truncate flex-1">{file.name}</span>
                    <span className="text-slate-500 shrink-0">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeReplyFile(idx)}
                      className="text-slate-400 hover:text-red-400 transition-colors shrink-0"
                    >
                      <XIcon size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}

      {!canReply && (
        <div className="border-t border-white/5 pt-6">
          <p className="text-center text-sm text-slate-500">
            Este ticket está {ticket.status === 'closed' ? 'cerrado' : 'resuelto'} y no admite nuevas respuestas.
          </p>
        </div>
      )}
    </div>
  )
}
