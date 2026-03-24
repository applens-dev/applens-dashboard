import type React from "react";
import { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

type HeaderProps = {
  title?: string;

  loggedIn?: boolean;
  toggleLogin?: () => void;

  rightAction?: React.ReactNode;
};

export default function Header({
  title = "",
  loggedIn = false,
  toggleLogin,
  rightAction,
}: HeaderProps) {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } =
    useAuth0();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const location = useLocation();

  const inOnboarding = location.pathname.startsWith("/onboarding");
  const inDashboard = location.pathname.startsWith("/dashboard");
  const inUploads = location.pathname.startsWith("/uploads");
  const inAppFlow = inOnboarding || inDashboard || inUploads;

  const brandText =
    title.trim().length > 0 ? `AppLens / ${title.trim()}` : "AppLens";

  const appNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium tracking-[0.12em] uppercase ${
      isActive
        ? "text-(--text-primary)"
        : "text-(--text-secondary) hover:text-(--text-primary)"
    }`;

  const renderAuthButton = (variant: "login" | "logout") => {
    const isLogout = variant === "logout";
    const label = isLogout ? "Log Out" : "Log In";
    const disabled = isLoading;

    const handleAuthAction = () => {
      if (isLogout) {
        logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
        return;
      }

      void loginWithRedirect({
        appState: {
          returnTo: location.pathname,
        },
      });
    };

    if (toggleLogin) {
      return (
        <button
          className="px-6 py-2 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
          onClick={toggleLogin}
          type="button"
        >
          {label}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAuthAction}
        disabled={disabled}
        className={
          isLogout
            ? "px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100 disabled:opacity-60"
            : "px-6 py-2 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100 disabled:opacity-60"
        }
      >
        {label}
      </button>
    );
  };

  const isLoggedIn = isAuthenticated || loggedIn;
  const userInitials = useMemo(() => {
    const raw = (user?.name || user?.email || "U").trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || "U").toUpperCase();
  }, [user?.email, user?.name]);

  const userProfileLabel = user?.name ? `${user.name} profile` : "Profile";
  const userProfileTitle = user?.name ?? user?.email ?? "Profile";

  const renderUserAvatar = () => {
    if (!isLoggedIn) return null;

    if (user?.picture && !avatarLoadFailed) {
      return (
        <img
          src={user.picture}
          alt={userProfileLabel}
          className="w-10 h-10 rounded-full border border-(--border) object-cover"
          onError={() => setAvatarLoadFailed(true)}
          referrerPolicy="no-referrer"
        />
      );
    }

    return (
      <div
        className="w-10 h-10 rounded-full border border-(--border) bg-white/10 text-(--text-primary) text-[11px] font-semibold tracking-[0.08em] flex items-center justify-center"
        aria-label={userProfileLabel}
        title={userProfileTitle}
      >
        {userInitials}
      </div>
    );
  };

  return (
    <header
      className="sticky top-0 z-50 border-b border-(--border)"
      style={{ backgroundColor: "#141414" }}
    >
      <div className="pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20 py-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/applens-logo.svg" alt="AppLens" className="h-6 w-auto" />
            {!isLoggedIn ? (
              <span className="text-sm font-medium tracking-[0.25em] text-(--text-primary) uppercase opacity-90 hover:opacity-100">
                {brandText}
                {inDashboard && !title ? " / Dashboard" : ""}
              </span>
            ) : null}
          </Link>

          {isLoggedIn ? (
            <nav className="flex items-center gap-5" aria-label="Primary">
              <NavLink to="/dashboard" className={appNavLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/uploads" className={appNavLinkClass}>
                Uploads
              </NavLink>
            </nav>
          ) : null}
        </div>

        <nav className="flex items-center gap-3">
          {!inAppFlow ? (
            <>
              <Link
                to="/use-cases"
                className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
              >
                Use Cases
              </Link>

              {isLoggedIn
                ? renderAuthButton("logout")
                : renderAuthButton("login")}
              {renderUserAvatar()}
            </>
          ) : (
            <>
              {rightAction ?? renderAuthButton("logout")}
              {renderUserAvatar()}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
