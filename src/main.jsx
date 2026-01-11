import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import App from './App.jsx'
import './index.css'

// Importaciones de Contexto
import { WorkerAuthProvider } from './context/WorkerAuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext'; // <--- ESTO DEBE ESTAR ASÍ

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider>
        {/* EL ORDEN ES IMPORTANTE: AuthProvider primero */}
        <AuthProvider>
          <WorkerAuthProvider>
            <CompanyProvider>
              <App />
            </CompanyProvider>
          </WorkerAuthProvider>
        </AuthProvider>
      </HeroUIProvider>
    </BrowserRouter>
  </React.StrictMode>,
)