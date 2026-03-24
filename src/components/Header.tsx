import type React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

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
      <Link
        to={isLogout ? "/" : "/login"}
        className={
          isLogout
            ? "px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
            : "px-6 py-2 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        }
      >
        {label}
      </Link>
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
            {!loggedIn ? (
              <span className="text-sm font-medium tracking-[0.25em] text-(--text-primary) uppercase opacity-90 hover:opacity-100">
                {brandText}
                {inDashboard && !title ? " / Dashboard" : ""}
              </span>
            ) : null}
          </Link>

          {loggedIn ? (
            <nav className="flex items-center gap-5" aria-label="Primary">
              <NavLink to="/dashboard" className={appNavLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/uploads" className={appNavLinkClass}>
                Upload
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

              {loggedIn ? renderAuthButton("logout") : renderAuthButton("login")}
            </>
          ) : (
            rightAction ?? renderAuthButton("logout")
          )}
        </nav>
      </div>
    </header>
  );
}
