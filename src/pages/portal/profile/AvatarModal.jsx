import { useRef, useState } from 'react'
import { Upload, Image as ImageIcon, Palette, Trash2 } from 'lucide-react'
import { Modal } from './components'
import api, { apiRequest, getAccessToken, BASE_URL } from '../../../services/api'

const GRADIENTS = [
  { slug: 'purple-cyan', label: 'Purple Cyan', css: 'linear-gradient(135deg, #4c1d95 0%, #1e40af 35%, #0c4a6e 70%, #134e4a 100%)' },
  { slug: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)' },
  { slug: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #14b8a6 100%)' },
  { slug: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #166534 0%, #14b8a6 50%, #0c4a6e 100%)' },
  { slug: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg, #4c1d95 0%, #06b6d4 50%, #10b981 100%)' },
  { slug: 'crimson', label: 'Crimson', css: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #f59e0b 100%)' },
  { slug: 'gold', label: 'Gold', css: 'linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde047 100%)' },
  { slug: 'mint', label: 'Mint', css: 'linear-gradient(135deg, #047857 0%, #10b981 50%, #6ee7b7 100%)' },
  { slug: 'lavender', label: 'Lavender', css: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #f0abfc 100%)' },
  { slug: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg, #020617 0%, #1e293b 50%, #334155 100%)' },
  { slug: 'coral', label: 'Coral', css: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)' },
  { slug: 'slate', label: 'Slate', css: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #94a3b8 100%)' },
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
                borderRadius: 10,
                border: '1px solid var(--pf-border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 8,
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
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
