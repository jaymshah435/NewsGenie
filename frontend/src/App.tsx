// All pages and their URLs.

import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./Layout";
import { AuthProvider } from "./lib/auth";
import AnalyticsPage from "./pages/analytics";
import AssistantPage from "./pages/assistant";
import DashboardPage from "./pages/dashboard";
import LoginPage from "./pages/login";
import ModerationPage from "./pages/moderation";
import ProtectionPage from "./pages/protection";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/protection" element={<ProtectionPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
