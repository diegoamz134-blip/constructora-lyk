import { Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';

// Módulos de Autenticación
import LoginPage from './modules/auth/LoginPage';

// Módulos del Panel Administrativo
import DashboardPage from './modules/admin-control/DashboardPage';
import UserProfilePage from './modules/admin-control/UserProfilePage';
import ReportsPage from './modules/admin-control/ReportsPage';
import HumanResourcesPage from './modules/hr/HumanResourcesPage';

// Módulos del Panel de Obrero
import WorkerDashboard from './modules/worker/WorkerDashboard';
import WorkerAttendance from './modules/worker/WorkerAttendance';

function App() {
  return (
    <Routes>
      {/* 1. Ruta Inicial (Login Unificado) */}
      <Route path="/" element={<LoginPage />} />
      
      {/* 2. Rutas del Panel de Obrero (Layout Móvil con Navegación Inferior) */}
      <Route path="/worker" element={<WorkerLayout />}>
         {/* Pantalla Principal del Obrero */}
         <Route path="dashboard" element={<WorkerDashboard />} />
         {/* Pantalla de Registro de Asistencia (Cámara/GPS) */}
         <Route path="asistencia" element={<WorkerAttendance />} />
      </Route>

      {/* 3. Rutas del Panel Administrativo (Layout de Escritorio con Sidebar) */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Gestión de Recursos Humanos */}
        <Route path="/users" element={<HumanResourcesPage />} />
        
        {/* Perfil del Administrador */}
        <Route path="/profile" element={<UserProfilePage />} />
        
        {/* Reportes de Asistencia */}
        <Route path="/reportes" element={<ReportsPage />} />

        {/* Placeholders para futuros módulos */}
        <Route path="/proyectos" element={<div className="p-10 text-slate-400 font-bold text-xl">Módulo de Proyectos en construcción...</div>} />
        <Route path="/finanzas" element={<div className="p-10 text-slate-400 font-bold text-xl">Módulo de Finanzas en construcción...</div>} />
        <Route path="/configuracion" element={<div className="p-10 text-slate-400 font-bold text-xl">Configuración del Sistema</div>} />
      </Route>
    </Routes>
  );
}

export default App;