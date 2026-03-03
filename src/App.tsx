import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import UseCasesPage from "./pages/UseCasesPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OnboardingLayout from "./layouts/OnboardingLayout";
import ImportTerraformPage from "./pages/ImportTerraformPage";
import ConnectAwsPage from "./pages/ConnectAwsPage";
import SetContextPage from "./pages/SetContextPage";
import { OnboardingProvider } from "./context/OnboardingContext";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/use-cases" element={<UseCasesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />

      <Route
        path="/onboarding"
        element={
          <OnboardingProvider>
            <OnboardingLayout />
          </OnboardingProvider>
        }
      >
        <Route index element={<Navigate to="/onboarding/import-terraform" replace />} />
        <Route path="import-terraform" element={<ImportTerraformPage />} />
        <Route path="connect-aws" element={<ConnectAwsPage />} />
        <Route path="set-context" element={<SetContextPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
