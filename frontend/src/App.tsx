import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { CommitmentsPage } from "./pages/CommitmentsPage";
import { HomePage } from "./pages/HomePage";
import { InboxPage } from "./pages/InboxPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TimelinePage } from "./pages/TimelinePage";
import { VaultPage } from "./pages/VaultPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/home" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="commitments" element={<CommitmentsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="inbox" element={<InboxPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  );
}
