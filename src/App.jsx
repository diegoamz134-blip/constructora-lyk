import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';

// Módulos de Autenticación
import LoginPage from './modules/auth/LoginPage';

// Módulos del Panel Administrativo
import DashboardPage from './modules/admin-control/DashboardPage';
import UserProfilePage from './modules/admin-control/UserProfilePage';
import ReportsPage from './modules/admin-control/ReportsPage'; // Asegúrate de haber creado este archivo

// Módulos de Recursos Humanos
import HumanResourcesPage from './modules/hr/HumanResourcesPage';

// Módulos de Trabajadores (Kiosco)
import WorkerAttendance from './modules/worker/WorkerAttendance'; // Asegúrate de haber creado este archivo

function App() {
  return (
    <Routes>
      {/* 1. Ruta Inicial (Login) */}
      <Route path="/" element={<LoginPage />} />
      
      {/* 2. Ruta Pública para Obreros (Modo Kiosco) */}
      {/* Esta ruta está FUERA del MainLayout para que no muestre la barra lateral ni requiera login de admin */}
      <Route path="/asistencia" element={<WorkerAttendance />} />

      {/* 3. Rutas Protegidas del Panel Administrativo */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Gestión de Personal (Staff y Obreros) */}
        <Route path="/users" element={<HumanResourcesPage />} />
        
        {/* Perfil del Usuario Logueado */}
        <Route path="/profile" element={<UserProfilePage />} />
        
        {/* Reportes de Asistencia */}
        <Route path="/reportes" element={<ReportsPage />} />

        {/* Placeholders para módulos futuros */}
        <Route path="/proyectos" element={<div className="p-10 text-slate-400 font-bold text-xl">Módulo de Proyectos en construcción...</div>} />
        <Route path="/finanzas" element={<div className="p-10 text-slate-400 font-bold text-xl">Módulo de Finanzas en construcción...</div>} />
        <Route path="/configuracion" element={<div className="p-10 text-slate-400 font-bold text-xl">Configuración del Sistema</div>} />
      </Route>
    </Routes>
  );
}

export default App;