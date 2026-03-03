import type React from "react";
import { Link, useLocation } from "react-router-dom";

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
  const inAppFlow = inOnboarding || inDashboard;

  const brandText =
    title.trim().length > 0 ? `AppLens / ${title.trim()}` : "AppLens";

  const AuthButton = ({ variant }: { variant: "login" | "logout" }) => {
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
        <Link to="/" className="flex items-center gap-3">
          <img src="/applens-logo.svg" alt="AppLens" className="h-6 w-auto" />
          <span className="text-sm font-medium tracking-[0.25em] text-(--text-primary) uppercase opacity-90 hover:opacity-100">
            {brandText}
            {inDashboard && !title ? " / Dashboard" : ""}
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {!inAppFlow ? (
            <>
              <Link
                to="/use-cases"
                className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
              >
                Use Cases
              </Link>

              {loggedIn ? <AuthButton variant="logout" /> : <AuthButton variant="login" />}
            </>
          ) : (
            rightAction ?? <AuthButton variant="logout" />
          )}
        </nav>
      </div>
    </header>
  );
}