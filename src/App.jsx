import { Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';

// Auth
import LoginPage from './modules/auth/LoginPage';
import AdminProtectedRoute from './modules/auth/AdminProtectedRoute';

// Módulos Admin
import DashboardPage from './modules/admin-control/DashboardPage';
import UserProfilePage from './modules/admin-control/UserProfilePage';
import ReportsPage from './modules/admin-control/ReportsPage';
import ConfigurationPage from './modules/admin-control/ConfigurationPage';

// Módulos RRHH
import HumanResourcesPage from './modules/hr/HumanResourcesPage';
import DocumentationPage from './modules/hr/DocumentationPage'; 
import PayrollPage from './modules/hr/PayrollPage';

// Proyectos
import ProjectsPage from './modules/projects/ProjectsPage'; 

// Licitaciones
import TendersPage from './modules/licitaciones/TendersPage';
import TenderDetail from './modules/licitaciones/TenderDetail';

// Worker
import WorkerDashboard from './modules/worker/WorkerDashboard';
import WorkerAttendance from './modules/worker/WorkerAttendance';
import WorkerProjectLog from './modules/worker/WorkerProjectLog';
import WorkerProjectView from './modules/worker/WorkerProjectView';

import { WorkerAuthProvider } from './context/WorkerAuthContext';

function App() {
  return (
    <WorkerAuthProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        {/* Panel Obrero */}
        <Route path="/worker" element={<WorkerLayout />}>
           <Route path="dashboard" element={<WorkerDashboard />} />
           <Route path="asistencia" element={<WorkerAttendance />} />
           <Route path="bitacora" element={<WorkerProjectLog />} />
           <Route path="proyecto" element={<WorkerProjectView />} />
        </Route>

        {/* Panel Admin */}
        <Route element={<AdminProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* RRHH */}
            <Route path="/users" element={<HumanResourcesPage />} />
            <Route path="/planillas" element={<PayrollPage />} />
            <Route path="/documentacion" element={<DocumentationPage />} />
            
            {/* Reportes y Configuración */}
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/configuracion" element={<ConfigurationPage />} />
            <Route path="/profile" element={<UserProfilePage />} />

            {/* Proyectos */}
            <Route path="/proyectos" element={<ProjectsPage />} />

            {/* Licitaciones */}
            <Route path="/licitaciones" element={<TendersPage />} />
            <Route path="/licitaciones/:id" element={<TenderDetail />} />
          </Route>
        </Route>

      </Routes>
    </WorkerAuthProvider>
  );
}

export default App;