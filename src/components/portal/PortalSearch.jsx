import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'
import { Search, Loader2, LifeBuoy, Receipt, ClipboardList, FolderKanban, FileText, Repeat } from 'lucide-react'
import { api } from '../../services/api'

const typeIcon = {
  ticket: LifeBuoy,
  invoice: Receipt,
  quote: ClipboardList,
  project: FolderKanban,
  document: FileText,
  contract: Repeat,
  recurring_service: Repeat,
}

export default function PortalSearch() {
  const [, setLocation] = useLocation()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const runSearch = useCallback(async (value) => {
    if (!value || value.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/client/search?q=${encodeURIComponent(value.trim())}`)
      setResults(response?.data ?? [])
      setActiveIndex(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const value = e.target.value
    setQ(value)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 250)
  }

  const go = (item) => {
    if (!item?.href) return
    setLocation(item.href)
    setOpen(false)
    setQ('')
    setResults([])
  }

  const handleKey = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault()
      go(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative hidden md:block w-72">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Buscar..."
          className="w-full pl-9 pr-3 py-2 bg-background-dark border border-ink/[0.09] focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm text-ink placeholder:text-ink/34 transition-colors"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/45 animate-spin" />
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-ink/[0.09] shadow-portal-pop z-40 max-h-96 overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="p-4 text-sm text-ink/60 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Buscando...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-4 text-sm text-ink/45">Sin resultados.</div>
          )}
          {results.length > 0 && (
            <ul>
              {results.map((r, idx) => {
                const Icon = typeIcon[r.type] || Search
                return (
                  <li key={`${r.type}-${r.id}-${idx}`}>
                    <button
                      onClick={() => go(r)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center gap-3 w-full text-left px-4 py-2.5 transition-colors ${
                        idx === activeIndex ? 'bg-primary/10' : 'hover:bg-ink/[0.06]'
                      }`}
                    >
                      <Icon size={16} className="text-ink/45 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink truncate">{r.title}</p>
                        {r.subtitle && (
                          <p className="text-xs text-ink/45 truncate">{r.subtitle}</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
