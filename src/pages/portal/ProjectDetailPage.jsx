import { motion } from 'framer-motion'
import { Link, useRoute } from 'wouter'
import { ArrowLeft, CheckCircle, Clock, Circle, Calendar, Users } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

const statusConfig = {
  in_progress: { label: 'En Progreso', bg: 'bg-primary/20', text: 'text-primary' },
  completed: { label: 'Completado', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  paused: { label: 'Pausado', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/20', text: 'text-red-400' },
}

const milestoneIconConfig = {
  completed: { icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-white' },
  in_progress: { icon: Clock, color: 'bg-primary', textColor: 'text-white', pulse: true },
  pending: { icon: Circle, color: 'bg-slate-600', textColor: 'text-slate-400' },
}

const lineColorConfig = {
  completed: 'border-emerald-500',
  in_progress: 'border-primary',
  pending: 'border-slate-600',
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

export default function ProjectDetailPage() {
  const [, params] = useRoute('/portal/projects/:id')
  const id = params?.id

  const { data, loading, error, refetch } = useApi(`/client/projects/${id}`, {
    immediate: !!id,
  })

  const project = data?.data ?? data

  if (loading) {
    return (
      <div>
        <Link to="/portal/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a proyectos</span>
        </Link>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link to="/portal/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a proyectos</span>
        </Link>
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={refetch} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">Reintentar</button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <Link to="/portal/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} />
          <span>Volver a proyectos</span>
        </Link>
        <div className="text-center py-16 text-slate-500">
          Proyecto no encontrado.
        </div>
      </div>
    )
  }

  const status = statusConfig[project?.status] ?? statusConfig.in_progress
  const milestones = project?.milestones ?? []
  const teamMembers = project?.team_members ?? []

  return (
    <div>
      <Link to="/portal/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} />
        <span>Volver a proyectos</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <h1 className="text-3xl font-display font-bold text-white">{project?.name}</h1>
          <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <p className="text-slate-400 mb-6 max-w-3xl">{project?.description}</p>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progreso general</span>
            <span className="text-lg font-bold text-white">{project?.progress ?? 0}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${project?.progress ?? 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={14} />
            <span>Inicio: <span className="text-white">{project?.start_date}</span></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={14} />
            <span>Estimado: <span className="text-white">{project?.estimated_end_date}</span></span>
          </div>
          {project?.actual_end_date && (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={14} />
              <span>Finalizado: <span className="text-white">{project?.actual_end_date}</span></span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-display font-bold text-white mb-6">Hitos del Proyecto</h2>

        <motion.div
          className="relative"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {milestones.map((milestone, index) => {
            const status = milestone?.completed ? 'completed' : 'pending'
            const config = milestoneIconConfig[status]
            const Icon = config.icon
            const lineColor = lineColorConfig[status]
            const isLast = index === milestones.length - 1

            return (
              <motion.div
                key={milestone?.id ?? index}
                variants={fadeUp}
                className="flex gap-4 relative"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}>
                    <Icon size={16} className={config.textColor} />
                  </div>
                  {!isLast && (
                    <div className={`w-0 border-l-2 ${lineColor} flex-grow min-h-[24px]`} />
                  )}
                </div>

                <div className="bg-surface-dark p-4 rounded-xl border border-white/5 mb-3 flex-grow">
                  <h3 className="text-white font-medium">{milestone?.title}</h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      Fecha límite: {milestone?.due_date}
                    </span>
                    {milestone?.completed_at && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Completado: {milestone?.completed_at}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {milestones.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No hay hitos definidos para este proyecto.
          </div>
        )}
      </motion.div>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <Users size={20} />
          Equipo Asignado
        </h2>

        <div className="flex flex-wrap gap-6">
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                {getInitials(member?.name ?? '')}
              </div>
              <div>
                <p className="text-white font-medium">{member?.name}</p>
                <p className="text-sm text-slate-400">{member?.role}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {teamMembers.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No hay miembros de equipo asignados.
          </div>
        )}
      </motion.div>
    </div>
  )
}
