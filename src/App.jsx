import { Routes, Route } from 'react-router-dom';
import LoginPage from './modules/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './modules/admin-control/DashboardPage';

function App() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/" element={<LoginPage />} />

      {/* Rutas protegidas dentro del Layout */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Aquí irás agregando las demás: /users, /projects, etc. */}
      </Route>
    </Routes>
  );
}

export default App;