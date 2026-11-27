import { Navigate, Route, Routes } from 'react-router-dom'
import { LOGIN_ROUTE, PASSWORD_ROUTE, PublicOnly, RequireAuth, RequirePermission } from './auth/Guards'
import { AppShell } from './components/layout/AppShell'
import { AccountPage } from './pages/AccountPage'
import { AdminIndex } from './pages/admin/AdminIndex'
import { AuditPage } from './pages/admin/AuditPage'
import { RolesPage } from './pages/admin/RolesPage'
import { UsersPage } from './pages/admin/UsersPage'
import { ForcedPasswordPage } from './pages/ForcedPasswordPage'
import { LoginPage } from './pages/LoginPage'
import {
  AlertsPending,
  BackupsPending,
  DashboardPending,
  HistoryPending,
  MachinesPending,
  NetworkPending,
  ServersPending,
  ServicesPending,
  SettingsPending,
} from './pages/modules'
import { NotFoundPage } from './pages/NotFoundPage'

const guard = (any: string[], element: React.ReactNode) => <RequirePermission any={any}>{element}</RequirePermission>

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path={LOGIN_ROUTE} element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path={PASSWORD_ROUTE} element={<ForcedPasswordPage />} />
        <Route element={<AppShell />}>
          <Route index element={guard(['dashboard.view'], <DashboardPending />)} />
          <Route path="machines" element={guard(['machines.view'], <MachinesPending />)} />
          <Route path="services" element={guard(['services.view'], <ServicesPending />)} />
          <Route path="reseau" element={guard(['machines.view'], <NetworkPending />)} />
          <Route path="serveurs" element={guard(['servers.view'], <ServersPending />)} />
          <Route path="alertes" element={guard(['alerts.view'], <AlertsPending />)} />
          <Route path="historique" element={guard(['history.view'], <HistoryPending />)} />
          <Route path="parametres" element={guard(['settings.view'], <SettingsPending />)} />
          <Route path="compte" element={<AccountPage />} />
          <Route path="admin" element={<AdminIndex />} />
          <Route path="admin/utilisateurs" element={guard(['users.view'], <UsersPage />)} />
          <Route path="admin/roles" element={guard(['users.view'], <RolesPage />)} />
          <Route path="admin/audit" element={guard(['audit.view'], <AuditPage />)} />
          <Route path="admin/sauvegardes" element={guard(['backups.view'], <BackupsPending />)} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
