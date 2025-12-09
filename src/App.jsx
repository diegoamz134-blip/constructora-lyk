import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './modules/auth/LoginPage';
import DashboardPage from './modules/admin-control/DashboardPage';
import HumanResourcesPage from './modules/hr/HumanResourcesPage';
// 1. Importar la nueva página de perfil
import UserProfilePage from './modules/admin-control/UserProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<HumanResourcesPage />} />
        
        {/* 2. Agregar la ruta del perfil */}
        <Route path="/profile" element={<UserProfilePage />} />

        {/* Rutas pendientes */}
        <Route path="/proyectos" element={<div className="p-10 text-slate-400">Proyectos...</div>} />
        <Route path="/finanzas" element={<div className="p-10 text-slate-400">Finanzas...</div>} />
        <Route path="/reportes" element={<div className="p-10 text-slate-400">Reportes...</div>} />
        <Route path="/configuracion" element={<div className="p-10 text-slate-400">Configuración...</div>} />
      </Route>
    </Routes>
  );
}

export default App;