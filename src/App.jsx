import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Contextos
import { AuthProvider } from './context/AuthContext';
import { WorkerAuthProvider } from './context/WorkerAuthContext';
import { CompanyProvider } from './context/CompanyContext';

// Layouts y Rutas Protegidas
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import RoleProtectedRoute from './components/layout/RoleProtectedRoute';
import AdminProtectedRoute from './modules/auth/AdminProtectedRoute';

// Páginas (Lazy Loading)
const LoginPage = lazy(() => import('./modules/auth/LoginPage'));

// Admin / Staff Pages
const DashboardPage = lazy(() => import('./modules/admin-control/DashboardPage'));
const ProjectsPage = lazy(() => import('./modules/projects/ProjectsPage')); // <--- AHORA ACCESIBLE PARA RESIDENTES
const HumanResourcesPage = lazy(() => import('./modules/hr/HumanResourcesPage'));
const PayrollPage = lazy(() => import('./modules/hr/PayrollPage'));
const DocumentationPage = lazy(() => import('./modules/hr/DocumentationPage'));
const ReportsPage = lazy(() => import('./modules/admin-control/ReportsPage'));
const ConfigurationPage = lazy(() => import('./modules/admin-control/ConfigurationPage'));
const UserProfilePage = lazy(() => import('./modules/admin-control/UserProfilePage'));
const FieldAttendancePage = lazy(() => import('./modules/resident/FieldAttendancePage')); // <--- TAREO DE CAMPO
const TendersPage = lazy(() => import('./modules/licitaciones/TendersPage'));

// Worker Pages
const WorkerDashboard = lazy(() => import('./modules/worker/WorkerDashboard'));
const WorkerAttendance = lazy(() => import('./modules/worker/WorkerAttendance'));
const WorkerProfilePage = lazy(() => import('./modules/worker/WorkerProfilePage'));

// Public / Landing
const ClientLandingPage = lazy(() => import('./modules/landing/ClientLandingPage'));

const App = () => {
  return (
    <AuthProvider>
      <WorkerAuthProvider>
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50">Cargando...</div>}>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<ClientLandingPage />} />
            
            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* === RUTAS DEL SISTEMA PRINCIPAL (Admin, RRHH, Staff, Residentes) === */}
            
            {/* GRUPO 1: DASHBOARD GENERAL (Todos los roles internos) */}
            <Route element={<RoleProtectedRoute allowedRoles={['admin', 'rrhh', 'resident_engineer', 'staff', 'logistica', 'obrero']} />}>
              <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
              </Route>
            </Route>

            {/* GRUPO 2: GESTIÓN DE OBRAS (Admin + Residentes + Staff Asignado) */}
            {/* CAMBIO: Agregamos 'resident_engineer' y 'staff' para que puedan ver SU lista de proyectos */}
            <Route element={<RoleProtectedRoute allowedRoles={['admin', 'resident_engineer', 'staff']} />}>
              <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                 <Route path="/proyectos" element={<ProjectsPage />} />
              </Route>
            </Route>

            {/* GRUPO 3: SUPERVISIÓN DE CAMPO (Admin + Residentes) */}
            <Route element={<RoleProtectedRoute allowedRoles={['admin', 'resident_engineer']} />}>
               <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                  <Route path="/campo/tareo" element={<FieldAttendancePage />} />
               </Route>
            </Route>

            {/* GRUPO 4: RECURSOS HUMANOS (Solo Admin y RRHH) - AQUÍ SE ASIGNAN LOS PROYECTOS */}
            <Route element={<RoleProtectedRoute allowedRoles={['admin', 'rrhh']} />}>
              <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                 <Route path="/users" element={<HumanResourcesPage />} />
                 <Route path="/planillas" element={<PayrollPage />} />
                 <Route path="/documentacion" element={<DocumentationPage />} />
                 <Route path="/reportes" element={<ReportsPage />} />
              </Route>
            </Route>

            {/* GRUPO 5: LICITACIONES Y CONFIGURACIÓN (Solo Admin) */}
            <Route element={<AdminProtectedRoute />}>
              <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                 <Route path="/licitaciones" element={<TendersPage />} />
                 <Route path="/configuracion" element={<ConfigurationPage />} />
                 <Route path="/finanzas" element={<div className="p-10 text-center">Módulo de Contabilidad en Construcción</div>} />
              </Route>
            </Route>

            {/* === RUTAS DEL PORTAL DEL OBRERO === */}
            <Route path="/worker" element={<WorkerLayout />}>
              <Route path="dashboard" element={<WorkerDashboard />} />
              <Route path="asistencia" element={<WorkerAttendance />} />
              <Route path="perfil" element={<WorkerProfilePage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </Suspense>
      </WorkerAuthProvider>
    </AuthProvider>
  );
};

export default App;