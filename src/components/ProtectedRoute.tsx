import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void loginWithRedirect({
        appState: {
          returnTo: location.pathname,
        },
      });
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, location.pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-(--page-bg) text-(--text-primary) flex items-center justify-center">
        <p className="text-sm tracking-[0.12em] uppercase text-(--text-muted)">
          Redirecting to login...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}