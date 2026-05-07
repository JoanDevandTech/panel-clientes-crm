import { useState } from 'react'
import ProtectedRoute from './ProtectedRoute'
import PortalSidebar from './PortalSidebar'
import PortalHeader from './PortalHeader'

export default function PortalLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="portal-shell flex min-h-screen">
        <PortalSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
          <PortalHeader onMenuClick={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
