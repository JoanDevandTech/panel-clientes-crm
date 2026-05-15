import { useState } from 'react'
import ProtectedRoute from './ProtectedRoute'
import PortalSidebar from './PortalSidebar'
import PortalHeader from './PortalHeader'
import ImpersonationBanner from './ImpersonationBanner'

export default function PortalLayout({ children, title, crumb }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="pr-shell portal-shell">
        <ImpersonationBanner />
        <div className="pr-app">
          <PortalSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="pr-main">
            <PortalHeader
              onMenuClick={() => setSidebarOpen(true)}
              title={title}
              crumb={crumb}
            />
            <div className="pr-content">{children}</div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
