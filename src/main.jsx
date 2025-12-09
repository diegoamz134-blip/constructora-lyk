import React from 'react'
import ReactDOM from 'react-dom/client'
// Importante: BrowserRouter debe envolver a toda la app
import { BrowserRouter } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider>
        <App />
      </HeroUIProvider>
    </BrowserRouter>
  </React.StrictMode>,
)