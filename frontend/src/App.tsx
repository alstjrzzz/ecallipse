import {Navigate, Outlet, Route, Routes} from 'react-router-dom';
import {useAuth} from './auth/AuthContext';
import {AppShell} from './components/AppShell';
import {AuthPage} from './pages/AuthPage';
import {CallPage} from './pages/CallPage';
import {CallResultPage} from './pages/CallResultPage';
import {ContactsPage} from './pages/ContactsPage';
import {DashboardPage} from './pages/DashboardPage';
import {DetachedWidgetPage} from './pages/DetachedWidgetPage';
import {LandingPage} from './pages/LandingPage';
import {SetupPage} from './pages/SetupPage';

function ProtectedRoute() {
  const {user} = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/contacts" element={<ContactsPage />} />
          <Route path="/app/setup" element={<SetupPage />} />
        </Route>
        <Route path="/calls/:callId" element={<CallPage />} />
        <Route path="/calls/:callId/result" element={<CallResultPage />} />
        <Route path="/calls/:callId/widgets/:widgetType" element={<DetachedWidgetPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
