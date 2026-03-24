import Header from "../components/Header";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

export default function LoginPage() {
  const {
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
    error,
  } = useAuth0();

  const handleLogin = async () => {
    await loginWithRedirect({
      appState: {
        returnTo: "/onboarding/import-terraform",
      },
   
    });
  };

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header />

      <div className="px-10 sm:px-16 lg:px-20 pt-24 max-w-xl">
        <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
          Log in
        </p>

        <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
          Secure sign in
        </h2>

        <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
          Sign in with Auth0 to access AppLens onboarding, dashboard, and protected API routes.
        </p>

        {isLoading ? (
          <p className="text-sm text-(--text-muted)">Loading authentication...</p>
        ) : isAuthenticated ? (
          <div className="space-y-5">
            <div className="border border-(--border) bg-white/2 rounded-xl p-5">
              <p className="text-sm mb-2">
                Logged in as <span className="font-medium">{user?.email ?? user?.name}</span>
              </p>
              {user?.picture && (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-14 h-14 rounded-full border border-(--border)"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/onboarding/import-terraform"
                className="inline-flex justify-center px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
              >
                Continue to Onboarding
              </Link>

              <button
                type="button"
                onClick={() =>
                  logout({
                    logoutParams: {
                      returnTo: window.location.origin,
                    },
                  })
                }
                className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40"
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-red-300">
                Auth error: {error.message}
              </p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
            >
              Continue with Google / Gmail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}