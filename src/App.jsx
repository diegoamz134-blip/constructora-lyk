import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CompanyProvider } from './context/CompanyContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import RoleProtectedRoute from './components/layout/RoleProtectedRoute';
import OnboardingGuard from './components/layout/OnboardingGuard';
import WorkerOnboardingGuard from './components/layout/WorkerOnboardingGuard'; 

// Páginas Públicas
const ClientLandingPage = React.lazy(() => import('./modules/landing/ClientLandingPage'));
const ComplaintsBookPage = React.lazy(() => import('./modules/landing/ComplaintsBookPage'));

// Páginas del Sistema
const LoginPage = React.lazy(() => import('./modules/auth/LoginPage'));
const DashboardPage = React.lazy(() => import('./modules/admin-control/DashboardPage'));
const ProjectsPage = React.lazy(() => import('./modules/projects/ProjectsPage')); 
const SedesPage = React.lazy(() => import('./modules/projects/SedesPage'));
const HumanResourcesPage = React.lazy(() => import('./modules/hr/HumanResourcesPage'));
const PayrollPage = React.lazy(() => import('./modules/hr/PayrollPage'));
const ReportsPage = React.lazy(() => import('./modules/admin-control/ReportsPage'));
const ConfigurationPage = React.lazy(() => import('./modules/admin-control/ConfigurationPage'));
const UserProfilePage = React.lazy(() => import('./modules/admin-control/UserProfilePage'));
const DocumentationPage = React.lazy(() => import('./modules/hr/DocumentationPage'));
const TendersPage = React.lazy(() => import('./modules/licitaciones/TendersPage'));
const TenderDetail = React.lazy(() => import('./modules/licitaciones/TenderDetail'));
const AccountingPage = React.lazy(() => import('./modules/admin-control/AccountingPage'));
const FieldAttendancePage = React.lazy(() => import('./modules/resident/FieldAttendancePage'));

// --- NUEVO IMPORT PARA LOGÍSTICA ---
const LogisticsPage = React.lazy(() => import('./modules/logistics/LogisticsPage'));
// -----------------------------------

const SsomaPage = React.lazy(() => import('./modules/ssoma/SsomaPage'));

// PÁGINAS DE ONBOARDING
const StaffOnboardingPage = React.lazy(() => import('./modules/onboarding/StaffOnboardingPage'));
const WorkerOnboardingPage = React.lazy(() => import('./modules/onboarding/WorkerOnboardingPage')); 

// PÁGINA DE MANTENIMIENTO
const MaintenancePage = React.lazy(() => import('./components/common/MaintenancePage'));

// Worker Pages
const WorkerDashboard = React.lazy(() => import('./modules/worker/WorkerDashboard'));
const WorkerAttendance = React.lazy(() => import('./modules/worker/WorkerAttendance'));
const WorkerProjectView = React.lazy(() => import('./modules/worker/WorkerProjectView'));
const WorkerProjectLog = React.lazy(() => import('./modules/worker/WorkerProjectLog'));
const WorkerProfilePage = React.lazy(() => import('./modules/worker/WorkerProfilePage'));

const LoadingSpinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
  </div>
);

// GRUPO DE ALTA DIRECCIÓN PARA REUTILIZAR
const MANAGERS = ['admin', 'gerencia_general', 'gerencia_admin_finanzas', 'gerente_proyectos', 'coordinador_proyectos', 'jefe_rrhh'];

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<ClientLandingPage />} />
        <Route path="/libro-reclamaciones" element={<ComplaintsBookPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* --- ONBOARDING STAFF --- */}
        <Route path="/onboarding" element={<StaffOnboardingPage />} />

        {/* --- ONBOARDING OBREROS --- */}
        <Route path="/worker/onboarding" element={<WorkerOnboardingPage />} />

        {/* --- RUTAS PROTEGIDAS STAFF --- */}
        <Route element={<OnboardingGuard />}>
          <Route element={<RoleProtectedRoute allowedRoles={[
              ...MANAGERS, 
              'contador', 'analista_contable', 'asistente_contabilidad', 'administrador', 
              'asistente_administrativo', 'asistente_logistica', 'encargado_almacen', 'servicios_generales', 
              'transportista', 'limpieza', 'tesorera', 'residente_obra', 'encargado_obra', 
              'asistente_residente', 'jefe_licitaciones', 'asistente_costos', 'jefe_ssoma', 
              'coordinador_ssoma', 'prevencionista', 'jefe_calidad'
          ]} />}>
            <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
               <Route path="/dashboard" element={<DashboardPage />} />
               <Route path="/profile" element={<UserProfilePage />} />
            </Route>
          </Route>

          {/* EJECUCIÓN DE OBRAS + CAMPO */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'residente_obra', 'encargado_obra', 'jefe_calidad']} />}>
            <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
               <Route path="/proyectos" element={<ProjectsPage />} />
               <Route path="/proyectos/sedes" element={<SedesPage />} />
               <Route path="/campo/tareo" element={<FieldAttendancePage />} />
            </Route>
          </Route>

          {/* LICITACIONES */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'jefe_licitaciones']} />}>
            <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
               <Route path="/licitaciones" element={<TendersPage />} />
               <Route path="/licitaciones/:id" element={<TenderDetail />} />
            </Route>
          </Route>

          {/* ADMINISTRACIÓN */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'contador', 'analista_contable', 'administrador', 'asistente_administrativo']} />}>
             <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                <Route path="/administracion" element={<MaintenancePage title="Oficina de Administración" />} />
             </Route>
          </Route>

          {/* LOGÍSTICA - ACTUALIZADO */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'contador', 'analista_contable', 'administrador', 'asistente_logistica', 'encargado_almacen']} />}>
             <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                {/* Aquí conectamos tu nueva página */}
                <Route path="/logistica" element={<LogisticsPage />} />
             </Route>
          </Route>

          {/* TESORERÍA */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'administrador', 'tesorera']} />}>
             <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                <Route path="/tesoreria" element={<MaintenancePage title="Tesorería" />} />
             </Route>
          </Route>

          {/* SSOMA */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'jefe_ssoma', 'coordinador_ssoma', 'prevencionista']} />}>
             <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
                <Route path="/ssoma" element={<SsomaPage />} />
             </Route>
          </Route>

          {/* RRHH */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'contador', 'analista_contable', 'administrador', 'asistente_rrhh']} />}>
            <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
               <Route path="/users" element={<HumanResourcesPage />} />
               <Route path="/planillas" element={<PayrollPage />} />
               <Route path="/documentacion" element={<DocumentationPage />} />
            </Route>
          </Route>

          {/* CONTABILIDAD */}
          <Route element={<RoleProtectedRoute allowedRoles={[...MANAGERS, 'contador', 'analista_contable', 'administrador', 'asistente_contabilidad']} />}>
            <Route element={<CompanyProvider><MainLayout /></CompanyProvider>}>
               <Route path="/finanzas" element={<AccountingPage />} />
               <Route path="/reportes" element={<ReportsPage />} />
               <Route path="/configuracion" element={<ConfigurationPage />} />
            </Route>
          </Route>

        </Route> {/* FIN DEL ONBOARDING GUARD STAFF */}

        {/* --- RUTAS DE OBREROS (WORKERS) --- */}
        <Route element={<WorkerOnboardingGuard />}>
          <Route path="/worker" element={<WorkerLayout />}>
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="asistencia" element={<WorkerAttendance />} />
            <Route path="bitacora" element={<WorkerProjectLog />} />
            <Route path="proyecto" element={<WorkerProjectView />} />
            <Route path="profile" element={<WorkerProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="p-10 text-center font-bold text-slate-600 mt-20">Página no encontrada (404)</div>} />
      </Routes>
    </Suspense>
  );
}

export default App;