import { Navigate, Route, Routes, useParams } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import UseCasesPage from "./pages/UseCasesPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import HomePage from "./pages/UploadsPage";
import OnboardingLayout from "./layouts/OnboardingLayout";
import ImportTerraformPage from "./pages/ImportTerraformPage";
import ConnectAwsPage from "./pages/ConnectAwsPage";
import SetContextPage from "./pages/SetContextPage";
import { OnboardingProvider } from "./context/OnboardingProvider";
import ProtectedRoute from "./components/ProtectedRoute";

function LegacyUploadDashboardRedirect() {
  const { uploadId } = useParams<{ uploadId: string }>();
  if (!uploadId) return <Navigate to="/home" replace />;
  return <Navigate to={`/home/uploads/${uploadId}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/use-cases" element={<UseCasesPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/uploads/:uploadId"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navigate to="/home" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/uploads/:uploadId"
        element={
          <ProtectedRoute>
            <LegacyUploadDashboardRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/inventory"
        element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/uploads"
        element={
          <ProtectedRoute>
            <Navigate to="/home" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingProvider>
              <OnboardingLayout />
            </OnboardingProvider>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<Navigate to="/onboarding/import-terraform" replace />}
        />
        <Route path="import-terraform" element={<ImportTerraformPage />} />
        <Route path="connect-aws" element={<ConnectAwsPage />} />
        <Route path="set-context" element={<SetContextPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
