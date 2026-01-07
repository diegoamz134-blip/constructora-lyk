import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import App from './App.jsx'
import './index.css'

// Providers
import { WorkerAuthProvider } from './context/WorkerAuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext'; // <--- El Provider Nuevo

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider>
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