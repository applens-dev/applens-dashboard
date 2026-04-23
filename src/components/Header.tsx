import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronDown } from "lucide-react";
import { getUploads, type UploadJob } from "../api/uploads";
import AppButton from "./AppButton";

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
  const {
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  const [isUploadsMenuOpen, setIsUploadsMenuOpen] = useState(false);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);
  const [uploadsLoadError, setUploadsLoadError] = useState<string | null>(null);
  const location = useLocation();

  const inOnboarding = location.pathname.startsWith("/onboarding");
  const inHome = location.pathname.startsWith("/home");
  const inUploads = location.pathname.startsWith("/uploads");
  const inDashboard = location.pathname.startsWith("/dashboard");
  const inAppFlow = inOnboarding || inHome || inUploads || inDashboard;
  const inUploadDashboard = location.pathname.startsWith("/home/uploads/");

  const brandText =
    title.trim().length > 0 ? `AppLens / ${title.trim()}` : "AppLens";

  const appNavBaseClass =
    "inline-flex items-center text-xs font-medium leading-none tracking-[0.12em] uppercase";

  const appNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${appNavBaseClass} ${isActive
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
        <AppButton variant="primary" size="header" onClick={toggleLogin}>
          {label}
        </AppButton>
      );
    }

    return (
      <AppButton
        onClick={handleAuthAction}
        disabled={disabled}
        variant={isLogout ? "outline" : "primary"}
        size="header"
      >
        {label}
      </AppButton>
    );
  };

  const isLoggedIn = isAuthenticated || loggedIn;

  useEffect(() => {
    if (!isAuthenticated || !inAppFlow) {
      setUploads([]);
      setUploadsLoadError(null);
      return;
    }

    let cancelled = false;

    const loadUploads = async () => {
      try {
        setIsLoadingUploads(true);
        setUploadsLoadError(null);

        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        const data = await getUploads(accessToken);
        if (cancelled) return;
        setUploads([...data].sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (error: unknown) {
        if (cancelled) return;
        setUploads([]);
        setUploadsLoadError(
          error instanceof Error ? error.message : "Failed to load uploads.",
        );
      } finally {
        if (!cancelled) {
          setIsLoadingUploads(false);
        }
      }
    };

    void loadUploads();

    return () => {
      cancelled = true;
    };
  }, [getAccessTokenSilently, inAppFlow, isAuthenticated]);

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

  const displayUploadName = (name: string | null | undefined) =>
    name?.trim() ? name : "default";

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
                {inHome && !title ? " / Home" : ""}
              </span>
            ) : null}
          </Link>

          {isLoggedIn ? (
            <nav className="flex items-center gap-5" aria-label="Primary">
              <NavLink to="/home" end className={appNavLinkClass}>
                Home
              </NavLink>

              <div
                className="relative flex items-center"
                onMouseEnter={() => setIsUploadsMenuOpen(true)}
                onMouseLeave={() => setIsUploadsMenuOpen(false)}
              >
                <button
                  type="button"
                  className={`${appNavBaseClass} h-3 appearance-none border-0 bg-transparent p-0 gap-1 [font-family:inherit] ${isUploadsMenuOpen || inUploadDashboard
                    ? "text-(--text-primary)"
                    : "text-(--text-secondary) hover:text-(--text-primary)"
                    }`}
                  aria-haspopup="menu"
                  aria-expanded={isUploadsMenuOpen}
                >
                  Uploads
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 transition-transform duration-150 ${isUploadsMenuOpen ? "rotate-180" : "rotate-0"
                      }`}
                  />
                </button>

                {isUploadsMenuOpen ? (
                  <>
                    <div className="absolute left-0 top-full z-40 h-3 min-w-64" aria-hidden />
                    <div
                      className="header-uploads-dropdown absolute left-0 top-full z-50 mt-3 min-w-64 border border-(--border) bg-[#141414] p-2 shadow-2xl"
                      role="menu"
                      aria-label="Uploads"
                    >
                      {isLoadingUploads ? (
                        <p className="px-3 py-2 text-xs text-(--text-secondary)">
                          Loading uploads...
                        </p>
                      ) : uploadsLoadError ? (
                        <p className="px-3 py-2 text-xs text-red-200">Failed to load uploads.</p>
                      ) : uploads.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-(--text-secondary)">
                          No uploads yet.
                        </p>
                      ) : (
                        uploads.map((upload) => (
                          <Link
                            key={upload.uploadId}
                            to={`/home/uploads/${upload.uploadId}`}
                            className="block px-3 py-2 text-xs text-(--text-primary) hover:bg-white/10"
                            role="menuitem"
                            onClick={() => setIsUploadsMenuOpen(false)}
                          >
                            {displayUploadName(upload.name)}
                          </Link>
                        ))
                      )}
                    </div>
                  </>
                ) : null}
              </div>
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
