import { Link } from 'wouter'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-background-dark">
      <h1 className="font-display text-6xl font-semibold tracking-[-0.035em] text-primary mb-4">404</h1>
      <p className="text-xl text-ink/60">Página no encontrada.</p>
      <Link
        href="/portal/dashboard"
        className="mt-8 px-6 py-2 border border-ink/16 text-ink/75 hover:border-ink/45 hover:text-ink transition-colors font-mono text-xs uppercase tracking-[0.16em]"
      >
        Ir al portal
      </Link>
    </div>
  )
}
