import { Link } from 'wouter'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-background-dark">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-slate-400">Página no encontrada.</p>
      <Link
        href="/portal/dashboard"
        className="mt-8 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
      >
        Ir al portal
      </Link>
    </div>
  )
}
