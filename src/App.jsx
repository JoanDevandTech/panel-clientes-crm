import { useEffect, lazy, Suspense } from 'react'
import { Router, Route, Switch, useLocation, Redirect } from 'wouter'
import PortalLayout from './components/portal/PortalLayout'

import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'))
const ImpersonatePage = lazy(() => import('./pages/ImpersonatePage'))

const DashboardPage = lazy(() => import('./pages/portal/DashboardPage'))
const ProjectsPage = lazy(() => import('./pages/portal/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/portal/ProjectDetailPage'))
const TicketsPage = lazy(() => import('./pages/portal/TicketsPage'))
const NewTicketPage = lazy(() => import('./pages/portal/NewTicketPage'))
const TicketDetailPage = lazy(() => import('./pages/portal/TicketDetailPage'))
const InvoicesPage = lazy(() => import('./pages/portal/InvoicesPage'))
const InvoiceDetailPage = lazy(() => import('./pages/portal/InvoiceDetailPage'))
const QuotesPage = lazy(() => import('./pages/portal/QuotesPage'))
const QuoteDetailPage = lazy(() => import('./pages/portal/QuoteDetailPage'))
const ContractsPage = lazy(() => import('./pages/portal/ContractsPage'))
const ContractDetailPage = lazy(() => import('./pages/portal/ContractDetailPage'))
const DocumentsPage = lazy(() => import('./pages/portal/DocumentsPage'))
const ActivityPage = lazy(() => import('./pages/portal/ActivityPage'))
const ProfilePage = lazy(() => import('./pages/portal/ProfilePage'))

function LazyFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--pr-bg-primary, #0a0e1a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="pr-spinner" />
    </div>
  )
}

function ScrollToTop() {
  const [location] = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])
  return null
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<LazyFallback />}>
        <Switch>
          <Route path="/">
            {() => <Redirect to="/portal/dashboard" />}
          </Route>
          <Route path="/login">
            {() => <LoginPage />}
          </Route>
          <Route path="/reset-password">
            {() => <ResetPasswordPage />}
          </Route>
          <Route path="/set-password/:token">
            {() => <SetPasswordPage />}
          </Route>
          <Route path="/auth/impersonate">
            {() => <ImpersonatePage />}
          </Route>
          <Route path="/portal/dashboard">
            {() => <PortalLayout title="Dashboard"><DashboardPage /></PortalLayout>}
          </Route>
          <Route path="/portal/projects/:id">
            {() => <PortalLayout title="Proyecto"><ProjectDetailPage /></PortalLayout>}
          </Route>
          <Route path="/portal/projects">
            {() => <PortalLayout title="Proyectos"><ProjectsPage /></PortalLayout>}
          </Route>
          <Route path="/portal/tickets/new">
            {() => <PortalLayout title="Nuevo Ticket"><NewTicketPage /></PortalLayout>}
          </Route>
          <Route path="/portal/tickets/:id">
            {() => <PortalLayout title="Detalle del Ticket"><TicketDetailPage /></PortalLayout>}
          </Route>
          <Route path="/portal/tickets">
            {() => <PortalLayout title="Soporte"><TicketsPage /></PortalLayout>}
          </Route>
          <Route path="/portal/invoices/:id">
            {() => <PortalLayout title="Factura"><InvoiceDetailPage /></PortalLayout>}
          </Route>
          <Route path="/portal/invoices">
            {() => <PortalLayout title="Facturas"><InvoicesPage /></PortalLayout>}
          </Route>
          <Route path="/portal/quotes/:id">
            {() => <PortalLayout title="Presupuesto"><QuoteDetailPage /></PortalLayout>}
          </Route>
          <Route path="/portal/quotes">
            {() => <PortalLayout title="Presupuestos"><QuotesPage /></PortalLayout>}
          </Route>
          <Route path="/portal/contracts/:id">
            {() => <PortalLayout title="Contrato"><ContractDetailPage /></PortalLayout>}
          </Route>
          <Route path="/portal/contracts">
            {() => <PortalLayout title="Contratos"><ContractsPage /></PortalLayout>}
          </Route>
          <Route path="/portal/documents">
            {() => <PortalLayout title="Documentos"><DocumentsPage /></PortalLayout>}
          </Route>
          <Route path="/portal/activity">
            {() => <PortalLayout title="Actividad"><ActivityPage /></PortalLayout>}
          </Route>
          <Route path="/portal/profile">
            {() => <PortalLayout title="Mi Perfil"><ProfilePage /></PortalLayout>}
          </Route>
          <Route path="/portal">
            {() => <Redirect to="/portal/dashboard" />}
          </Route>
          <Route>
            {() => <NotFoundPage />}
          </Route>
        </Switch>
      </Suspense>
    </Router>
  )
}
