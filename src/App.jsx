import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './modules/auth/LoginPage';
import DashboardPage from './modules/admin-control/DashboardPage';
import HumanResourcesPage from './modules/hr/HumanResourcesPage';
import UserProfilePage from './modules/admin-control/UserProfilePage';
// Nuevas importaciones
import ReportsPage from './modules/admin-control/ReportsPage';
import WorkerAttendance from './modules/worker/WorkerAttendance';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      
      {/* RUTA PÚBLICA PARA OBREROS (KIOSCO) */}
      <Route path="/asistencia" element={<WorkerAttendance />} />

      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<HumanResourcesPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        
        {/* RUTA DE REPORTES CONECTADA */}
        <Route path="/tickets" element={<ReportsPage />} /> {/* Usamos /tickets porque así estaba en el menú, o cámbialo a /reportes */}

        <Route path="/proyectos" element={<div className="p-10 text-slate-400">Proyectos...</div>} />
        <Route path="/finanzas" element={<div className="p-10 text-slate-400">Finanzas...</div>} />
        <Route path="/configuracion" element={<div className="p-10 text-slate-400">Configuración...</div>} />
      </Route>
    </Routes>
  );
}

export default App;