import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'wouter'
import { Calendar, TrendingUp } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

const statusConfig = {
  in_progress: { label: 'En Progreso', bg: 'bg-primary/20', text: 'text-primary' },
  completed: { label: 'Completado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  paused: { label: 'Pausado', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/20', text: 'text-red-400' },
}

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'in_progress', label: 'En Progreso' },
  { key: 'completed', label: 'Completados' },
  { key: 'paused', label: 'Pausados' },
]

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState('all')

  const { data, loading, error, refetch } = useApi('/client/projects', {
    params: {
      status: activeTab === 'all' ? undefined : activeTab,
    },
  })

  const projects = data?.data ?? []
  const total = data?.meta?.total ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">Reintentar</button>
      </div>
    )
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Mis Proyectos</h1>
        <p className="text-slate-400 mt-1">{total} proyectos en total</p>
      </div>

      <div className="flex gap-2 mt-6 flex-wrap">
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

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        key={activeTab}
      >
        {projects.map((project) => {
          const status = statusConfig[project?.status] ?? statusConfig.in_progress
          return (
            <motion.div key={project?.id} variants={fadeUp}>
              <Link
                to={`/portal/projects/${project?.id}`}
                className="block bg-surface-dark rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-bold text-white">{project?.name}</h3>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-slate-400 mb-4">{project?.description}</p>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <TrendingUp size={14} />
                      <span>Progreso</span>
                    </div>
                    <span className="text-sm font-medium text-white">{project?.progress ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${project?.progress ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={12} />
                    <span>Inicio: {project?.start_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={12} />
                    <span>Estimado: {project?.estimated_end_date}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {projects.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          No hay proyectos en esta categoría.
        </div>
      )}
    </div>
  )
}
