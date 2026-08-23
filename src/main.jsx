import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#FF1744', padding: 40, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", background: '#0D0E11', minHeight: '100vh' }}>
          <h1>Error rendering App:</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'rgba(248,249,250,0.45)' }}>{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

function AppWithProviders() {
  if (recaptchaKey) {
    return (
      <AuthProvider>
        <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
          <App />
        </GoogleReCaptchaProvider>
      </AuthProvider>
    )
  }
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppWithProviders />
    </ErrorBoundary>
  </React.StrictMode>,
)
