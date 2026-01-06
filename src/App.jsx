import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WorkerAuthProvider } from './context/WorkerAuthContext';
import { CompanyProvider } from './context/CompanyContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import RoleProtectedRoute from './components/layout/RoleProtectedRoute';

// Pages
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

// Loading
const LoadingSpinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
  </div>
);

function App() {
  return (
    <WorkerAuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* RUTA BASE */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* LOGIN */}
          <Route path="/login" element={<LoginPage />} />

          {/* =========================================================
              RUTAS ADMINISTRATIVAS (Protegidas por Roles)
             ========================================================= */}
          
          {/* GRUPO 1: ACCESO GENERAL (Todos ven Dashboard y Perfil) */}
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

          {/* GRUPO 5: SUPER ADMIN */}
          <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
               <Route path="/reportes" element={<ReportsPage />} />
               <Route path="/configuracion" element={<ConfigurationPage />} />
            </Route>
          </Route>

          {/* =========================================================
              RUTAS DE OBREROS
             ========================================================= */}
          <Route path="/worker" element={<WorkerLayout />}>
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="asistencia" element={<WorkerAttendance />} />
            <Route path="bitacora" element={<WorkerProjectLog />} />
            <Route path="proyecto" element={<WorkerProjectView />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<div className="p-10 text-center">Página no encontrada</div>} />

        </Routes>
      </Suspense>
    </WorkerAuthProvider>
  );
}

export default App;