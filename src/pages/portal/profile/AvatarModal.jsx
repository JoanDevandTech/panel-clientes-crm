import { useRef, useState } from 'react'
import { Upload, Image as ImageIcon, Palette, Trash2 } from 'lucide-react'
import { Modal } from './components'
import api, { apiRequest, getAccessToken, BASE_URL } from '../../../services/api'

const GRADIENTS = [
  { slug: 'purple-cyan', label: 'Krom', css: 'linear-gradient(135deg, #0D0E11 0%, #111319 45%, #0E3A44 78%, #00E5FF 100%)' },
  { slug: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #F59E0B 0%, #FF1744 50%, #EC4899 100%)' },
  { slug: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #0EA5E9 0%, #00E5FF 50%, #14B8A6 100%)' },
  { slug: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #166534 0%, #14b8a6 50%, #0c4a6e 100%)' },
  { slug: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg, #0D0E11 0%, #00E5FF 50%, #10B981 100%)' },
  { slug: 'crimson', label: 'Crimson', css: 'linear-gradient(135deg, #7F1D1D 0%, #FF1744 50%, #F59E0B 100%)' },
  { slug: 'gold', label: 'Gold', css: 'linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #FDE047 100%)' },
  { slug: 'mint', label: 'Mint', css: 'linear-gradient(135deg, #047857 0%, #10B981 50%, #6EE7B7 100%)' },
  { slug: 'lavender', label: 'Ice', css: 'linear-gradient(135deg, #101218 0%, #0E3A44 50%, #7FF0FF 100%)' },
  { slug: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg, #0D0E11 0%, #15171D 50%, #262A33 100%)' },
  { slug: 'coral', label: 'Coral', css: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)' },
  { slug: 'slate', label: 'Slate', css: 'linear-gradient(135deg, #111319 0%, #2A2E38 50%, #5B6068 100%)' },
]

async function uploadFile(endpoint, fieldName, file) {
  const formData = new FormData()
  formData.append(fieldName, file)
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Error al subir el archivo')
  }
  return res.json()
}

export function AvatarModal({ onClose, onSaved, onShowToast }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile('/client/profile/avatar', 'avatar', file)
      onShowToast?.('Foto actualizada')
      onSaved?.(res?.data ?? res)
      onClose()
    } catch (err) {
      onShowToast?.(err.message || 'No se pudo subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar tu foto de perfil?')) return
    try {
      await api.delete('/client/profile/avatar')
      onShowToast?.('Foto eliminada')
      onSaved?.({ avatar_url: null, avatar_thumbnails: null })
      onClose()
    } catch (err) {
      onShowToast?.(err.message || 'No se pudo eliminar la foto')
    }
  }

  return (
    <Modal title="Foto de perfil" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--pf-text-muted)', marginBottom: 16 }}>
        Sube una imagen JPG, PNG o WEBP de mínimo 200x200 px (máximo 5 MB).
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="pf-btn pf-primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} /> {uploading ? 'Subiendo…' : 'Subir foto'}
        </button>
        <button type="button" className="pf-btn pf-danger" onClick={handleDelete}>
          <Trash2 size={14} /> Eliminar
        </button>
      </div>
    </Modal>
  )
}

export function BannerModal({ onClose, onSaved, onShowToast }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState('gradient') // gradient | image

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile('/client/profile/cover', 'cover', file)
      onShowToast?.('Portada actualizada')
      onSaved?.(res?.data ?? res)
      onClose()
    } catch (err) {
      onShowToast?.(err.message || 'No se pudo subir la portada')
    } finally {
      setUploading(false)
    }
  }

  const setGradient = async (slug) => {
    try {
      const res = await apiRequest('/client/profile/cover/gradient', {
        method: 'PUT',
        body: JSON.stringify({ gradient_name: slug }),
      })
      onShowToast?.('Portada actualizada')
      onSaved?.(res?.data ?? res ?? { cover_type: 'gradient', cover_value: slug, cover_url: null })
      onClose()
    } catch (err) {
      onShowToast?.(err.message || 'No se pudo cambiar la portada')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete('/client/profile/cover')
      onShowToast?.('Portada restablecida')
      onSaved?.({ cover_type: 'gradient', cover_value: 'purple-cyan', cover_url: null })
      onClose()
    } catch (err) {
      onShowToast?.(err.message || 'No se pudo restablecer')
    }
  }

  return (
    <Modal
      title="Cambiar portada"
      onClose={onClose}
      footer={
        <button type="button" className="pf-btn pf-ghost pf-sm" onClick={handleDelete}>
          <Trash2 size={13} /> Restaurar gradiente por defecto
        </button>
      }
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button
          type="button"
          className={`pf-btn pf-sm ${tab === 'gradient' ? 'pf-primary' : 'pf-ghost'}`}
          onClick={() => setTab('gradient')}
        >
          <Palette size={13} /> Gradiente
        </button>
        <button
          type="button"
          className={`pf-btn pf-sm ${tab === 'image' ? 'pf-primary' : 'pf-ghost'}`}
          onClick={() => setTab('image')}
        >
          <ImageIcon size={13} /> Imagen
        </button>
      </div>

      {tab === 'gradient' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {GRADIENTS.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setGradient(g.slug)}
              style={{
                background: g.css,
                height: 80,
                border: '1px solid var(--pf-border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 8,
                color: 'var(--pr-text-primary)',
                fontFamily: 'var(--pr-font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 600,
                textShadow: '0 1px 3px rgba(13,14,17,0.75)',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'image' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--pf-text-muted)', marginBottom: 16 }}>
            Sube una imagen JPG, PNG o WEBP (máximo 8 MB). Proporción recomendada 3:1.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <button
            type="button"
            className="pf-btn pf-primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} /> {uploading ? 'Subiendo…' : 'Subir imagen'}
          </button>
        </>
      )}
    </Modal>
  )
}
