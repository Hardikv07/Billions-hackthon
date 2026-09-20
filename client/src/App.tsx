import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { LogoMark } from '@/components/Logo';
import Login from '@/pages/Login';
import Overview from '@/pages/Overview';
import Tenders from '@/pages/Tenders';
import TenderDetail from '@/pages/TenderDetail';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Approvals from '@/pages/Approvals';
import ApprovalDetail from '@/pages/ApprovalDetail';
import ExecutionWindows from '@/pages/ExecutionWindows';
import ImpactSimulator from '@/pages/ImpactSimulator';
import Escalations from '@/pages/Escalations';
import Reports from '@/pages/Reports';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading">
        <LogoMark className="h-11 w-11 animate-pulse rounded-[12px]" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="tenders" element={<Tenders />} />
        <Route path="tenders/:id" element={<TenderDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="approvals/:projectId/:key" element={<ApprovalDetail />} />
        <Route path="execution-windows" element={<ExecutionWindows />} />
        <Route path="impact" element={<ImpactSimulator />} />
        <Route path="escalations" element={<Escalations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
