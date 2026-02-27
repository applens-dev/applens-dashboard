import type React from "react";
import { Link, useLocation } from "react-router-dom";

type HeaderProps = {
  rightAction?: React.ReactNode;
};

export default function Header({ rightAction }: HeaderProps) {
  const location = useLocation();

  const inOnboarding = location.pathname.startsWith("/onboarding");
  const inDashboard = location.pathname.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 border-b border-(--border)" style={{ backgroundColor: "#141414" }}>
      <div className="pl-10 sm:pl-16 lg:pl-28 pr-8 sm:pr-12 lg:pr-20 py-6 flex items-center justify-between gap-6">
        <Link to="/" className="text-sm font-medium tracking-[0.25em] text-(--text-primary) uppercase opacity-90 hover:opacity-100">
          AppLens{inDashboard ? " / Dashboard" : ""}
        </Link>

        <nav className="flex items-center gap-3">
          {!inOnboarding && !inDashboard && (
            <>
              <Link
                to="/use-cases"
                className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
              >
                Use Cases
              </Link>
              <Link
                to="/login"
                className="px-6 py-2 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
              >
                Log In
              </Link>
            </>
          )}

          {(inOnboarding || inDashboard) && (rightAction ?? (
            <Link
              to="/"
              className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
            >
              Log Out
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
