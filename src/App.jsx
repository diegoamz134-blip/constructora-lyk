import { Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';

// Módulos de Autenticación
import LoginPage from './modules/auth/LoginPage';
import AdminProtectedRoute from './modules/auth/AdminProtectedRoute';

// Módulos del Panel Administrativo (Generales)
import DashboardPage from './modules/admin-control/DashboardPage';
import UserProfilePage from './modules/admin-control/UserProfilePage';
import ReportsPage from './modules/admin-control/ReportsPage';

// Módulos de Recursos Humanos
import HumanResourcesPage from './modules/hr/HumanResourcesPage';
import DocumentationPage from './modules/hr/DocumentationPage'; 
import AttendanceManagementPage from './modules/hr/AttendanceManagementPage'; // Tareo
import AbsenceManagementPage from './modules/hr/AbsenceManagementPage';       // Vacaciones
import PayrollPage from './modules/hr/PayrollPage';                           // Planillas (NUEVO)

// Módulos de Proyectos
import ProjectsPage from './modules/projects/ProjectsPage'; 

// Módulos de Licitaciones
import TendersPage from './modules/licitaciones/TendersPage';
import TenderDetail from './modules/licitaciones/TenderDetail';

// Módulos del Panel de Obrero
import WorkerDashboard from './modules/worker/WorkerDashboard';
import WorkerAttendance from './modules/worker/WorkerAttendance';
import WorkerProjectLog from './modules/worker/WorkerProjectLog';
import WorkerProjectView from './modules/worker/WorkerProjectView';

// Provider de Auth
import { WorkerAuthProvider } from './context/WorkerAuthContext';

function App() {
  return (
    <WorkerAuthProvider>
      <Routes>
        
        {/* 1. Ruta Inicial (Login) */}
        <Route path="/" element={<LoginPage />} />
        
        {/* 2. Rutas del Panel de Obrero (Móvil) */}
        <Route path="/worker" element={<WorkerLayout />}>
           <Route path="dashboard" element={<WorkerDashboard />} />
           <Route path="asistencia" element={<WorkerAttendance />} />
           <Route path="bitacora" element={<WorkerProjectLog />} />
           <Route path="proyecto" element={<WorkerProjectView />} />
        </Route>

        {/* 3. Rutas del Panel Administrativo (Escritorio - Protegidas) */}
        <Route element={<AdminProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* --- GESTIÓN DE RECURSOS HUMANOS --- */}
            <Route path="/users" element={<HumanResourcesPage />} />
            <Route path="/asistencia-admin" element={<AttendanceManagementPage />} />
            <Route path="/ausencias" element={<AbsenceManagementPage />} />
            <Route path="/planillas" element={<PayrollPage />} />
            <Route path="/documentacion" element={<DocumentationPage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            
            {/* Perfil */}
            <Route path="/profile" element={<UserProfilePage />} />

            {/* Proyectos */}
            <Route path="/proyectos" element={<ProjectsPage />} />

            {/* Licitaciones */}
            <Route path="/licitaciones" element={<TendersPage />} />
            <Route path="/licitaciones/:id" element={<TenderDetail />} />

            {/* Placeholders */}
            <Route path="/finanzas" element={<div className="p-10 text-slate-400 font-bold text-xl">Módulo de Finanzas en construcción...</div>} />
            <Route path="/configuracion" element={<div className="p-10 text-slate-400 font-bold text-xl">Configuración del Sistema</div>} />
          </Route>
        </Route>

      </Routes>
    </WorkerAuthProvider>
  );
}

export default App;