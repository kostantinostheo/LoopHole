import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import StatisticsPage from './pages/StatisticsPage';

const PRIVATE_PAGES = {
  '/': <DashboardPage />,
  '/settings': <SettingsPage />,
  '/calendar': <CalendarPage />,
  '/statistics': <StatisticsPage />,
};

// Private pages need a signed-in user; public ones (login/register) need the opposite.
function Guard({ isPrivate = false, children }) {
  const { user, initializing } = useAuth();

  if (initializing) return null;
  if (isPrivate && !user) return <Navigate to="/login" replace />;
  if (!isPrivate && user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-frame">
          <Routes>
            {['login', 'register'].map((mode) => (
              <Route
                key={mode}
                path={`/${mode}`}
                element={
                  <Guard>
                    <AuthPage key={mode} mode={mode} />
                  </Guard>
                }
              />
            ))}

            {Object.entries(PRIVATE_PAGES).map(([path, page]) => (
              <Route key={path} path={path} element={<Guard isPrivate>{page}</Guard>} />
            ))}

            <Route path="/sandbox" element={<DashboardPage sandbox />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
