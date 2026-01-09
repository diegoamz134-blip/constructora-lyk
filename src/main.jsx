import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import App from './App.jsx'
import './index.css'

// Providers
// Verifica que estas rutas sean correctas según tus carpetas
import { WorkerAuthProvider } from './context/WorkerAuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext'; // <--- ESTE ES EL QUE FALTA O FALLA

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider>
        {/* 1. AuthProvider debe envolver todo lo demás */}
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