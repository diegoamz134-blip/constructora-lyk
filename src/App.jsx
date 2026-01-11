import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CompanyProvider } from './context/CompanyContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import RoleProtectedRoute from './components/layout/RoleProtectedRoute';

// --- PÁGINAS PÚBLICAS (LANDING) ---
// Importación diferida (Lazy Loading) para mejor rendimiento
const ClientLandingPage = React.lazy(() => import('./modules/landing/ClientLandingPage'));
const ComplaintsBookPage = React.lazy(() => import('./modules/landing/ComplaintsBookPage'));

// --- PÁGINAS DEL SISTEMA INTERNO ---
const LoginPage = React.lazy(() => import('./modules/auth/LoginPage'));
const DashboardPage = React.lazy(() => import('./modules/admin-control/DashboardPage'));
const ProjectsPage = React.lazy(() => import('./modules/projects/ProjectsPage')); 
const HumanResourcesPage = React.lazy(() => import('./modules/hr/HumanResourcesPage'));
const PayrollPage = React.lazy(() => import('./modules/hr/PayrollPage'));
const ReportsPage = React.lazy(() => import('./modules/admin-control/ReportsPage'));
const ConfigurationPage = React.lazy(() => import('./modules/admin-control/ConfigurationPage'));
const UserProfilePage = React.lazy(() => import('./modules/admin-control/UserProfilePage'));
const DocumentationPage = React.lazy(() => import('./modules/hr/DocumentationPage'));
const TendersPage = React.lazy(() => import('./modules/licitaciones/TendersPage'));
const TenderDetail = React.lazy(() => import('./modules/licitaciones/TenderDetail'));

// Resident Pages
const FieldAttendancePage = React.lazy(() => import('./modules/resident/FieldAttendancePage'));

// Worker Pages
const WorkerDashboard = React.lazy(() => import('./modules/worker/WorkerDashboard'));
const WorkerAttendance = React.lazy(() => import('./modules/worker/WorkerAttendance'));
const WorkerProjectView = React.lazy(() => import('./modules/worker/WorkerProjectView'));
const WorkerProjectLog = React.lazy(() => import('./modules/worker/WorkerProjectLog'));
const WorkerProfilePage = React.lazy(() => import('./modules/worker/WorkerProfilePage'));

// Componente de Carga (Spinner)
const LoadingSpinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        
        {/* === RUTAS PÚBLICAS === */}
        {/* Landing Page Principal */}
        <Route path="/" element={<ClientLandingPage />} />
        
        {/* Libro de Reclamaciones */}
        <Route path="/libro-reclamaciones" element={<ComplaintsBookPage />} />
        
        {/* Login al Sistema (Oculto, sin link directo en la landing) */}
        <Route path="/login" element={<LoginPage />} />


        {/* === RUTAS PRIVADAS / SISTEMA INTERNO === */}

        {/* GRUPO 1: ACCESO GENERAL (Dashboard y Perfil) */}
        <Route element={<RoleProtectedRoute allowedRoles={['admin', 'rrhh', 'resident_engineer', 'staff', 'logistica']} />}>
          <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
             <Route path="/dashboard" element={<DashboardPage />} />
             <Route path="/profile" element={<UserProfilePage />} />
          </Route>
        </Route>

        {/* GRUPO 2: GESTIÓN DE OBRAS (Solo Admin) */}
        <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
             <Route path="/proyectos" element={<ProjectsPage />} />
             <Route path="/licitaciones" element={<TendersPage />} />
             <Route path="/licitaciones/:id" element={<TenderDetail />} />
          </Route>
        </Route>

        {/* GRUPO 3: SUPERVISIÓN DE CAMPO (Admin + Residentes) */}
        <Route element={<RoleProtectedRoute allowedRoles={['admin', 'resident_engineer']} />}>
           <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
              <Route path="/campo/tareo" element={<FieldAttendancePage />} />
           </Route>
        </Route>

        {/* GRUPO 4: RECURSOS HUMANOS (RRHH + Admin) */}
        <Route element={<RoleProtectedRoute allowedRoles={['admin', 'rrhh']} />}>
          <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
             <Route path="/users" element={<HumanResourcesPage />} />
             <Route path="/planillas" element={<PayrollPage />} />
             <Route path="/documentacion" element={<DocumentationPage />} />
          </Route>
        </Route>

        {/* GRUPO 5: SUPER ADMIN (Reportes y Configuración) */}
        <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
             <Route path="/reportes" element={<ReportsPage />} />
             <Route path="/configuracion" element={<ConfigurationPage />} />
          </Route>
        </Route>

        {/* === RUTAS DE OBREROS (WORKERS) === */}
        <Route path="/worker" element={<WorkerLayout />}>
          <Route path="dashboard" element={<WorkerDashboard />} />
          <Route path="asistencia" element={<WorkerAttendance />} />
          <Route path="bitacora" element={<WorkerProjectLog />} />
          <Route path="proyecto" element={<WorkerProjectView />} />
          <Route path="profile" element={<WorkerProfilePage />} />
        </Route>

        {/* 404 - Página no encontrada */}
        <Route path="*" element={<div className="p-10 text-center font-bold text-slate-600 mt-20">Página no encontrada (404)</div>} />

      </Routes>
    </Suspense>
  );
}

export default App;