import { useState } from 'react'
import { Link } from 'wouter'
import { ArrowLeft, Check, LifeBuoy, Wallet } from 'lucide-react'
import {
  PaymentMethodList,
  useMethodCopy,
  usePaymentMethods,
} from '../../components/portal/PaymentMethods'

// Toasts ligeros locales (mismo patrón que DocumentsPage)
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

export default function PaymentMethodsPage() {
  const { methods, loading, error, refetch } = usePaymentMethods()
  const { showToast, ToastStack } = useToasts()
  const { copiedId, onCopy } = useMethodCopy(showToast)

  if (loading) {
    return (
      <div className="pr-loading">
        <span className="pr-spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="pr-page-header">
        <Link href="/portal/dashboard" className="pr-page-crumb">
          <ArrowLeft size={14} /> Volver al dashboard
        </Link>
        <div className="pr-page-header-row">
          <div>
            <h1 className="pr-page-title">Métodos de pago</h1>
            <p className="pr-page-sub">
              Las formas de pago que el equipo tiene habilitadas para tu cuenta.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><Wallet size={32} /></div>
            <div>
              <p className="pr-empty-title">No se pudieron cargar los métodos de pago</p>
              <p className="pr-empty-desc">{error}</p>
            </div>
            <button className="pr-btn primary sm" onClick={refetch} type="button">
              Reintentar
            </button>
          </div>
        </div>
      ) : methods.length === 0 ? (
        <div className="pr-card">
          <div className="pr-empty">
            <div className="pr-empty-art"><Wallet size={32} /></div>
            <div>
              <p className="pr-empty-title">No hay métodos de pago disponibles</p>
              <p className="pr-empty-desc">
                Cuando el equipo habilite una forma de pago para tu cuenta aparecerá aquí.
                Mientras tanto, escríbenos y te indicamos cómo pagar.
              </p>
            </div>
            <Link href="/portal/tickets/new" className="pr-btn primary sm">
              <LifeBuoy size={13} /> Contactar con el equipo
            </Link>
          </div>
        </div>
      ) : (
        <>
          <PaymentMethodList methods={methods} copiedId={copiedId} onCopy={onCopy} />

          <p className="pm-foot">
            ¿Necesitas otra forma de pago?{' '}
            <Link href="/portal/tickets/new">Abre un ticket</Link> y lo revisamos.
          </p>
        </>
      )}

      <ToastStack />
    </div>
  )
}
