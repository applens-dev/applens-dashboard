import { NavLink, Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import { useOnboarding } from "../context/OnboardingContext";

function StepIcon({ done }: { done: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
        done ? "border-white/30 bg-white/10" : "border-white/15 bg-transparent"
      }`}
      aria-hidden
    >
      {done ? <span className="text-[11px]">✓</span> : null}
    </div>
  );
}

export default function OnboardingLayout() {
  const { state } = useOnboarding();
  const location = useLocation();

  const step1Done = Boolean(state.terraformUploadKey);
  const step2Done = state.awsConnected;
  const step3Done = state.contextAssigned;

  const items = [
    { to: "/onboarding/import-terraform", label: "Import Terraform", done: step1Done },
    { to: "/onboarding/connect-aws", label: "Connect AWS", done: step2Done },
    { to: "/onboarding/set-context", label: "Set context", done: step3Done },
  ];

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header />

      <div className="flex">
        <aside className="w-[280px] border-r border-(--border) min-h-[calc(100vh-73px)] px-6 py-10">
          <p className="text-sm font-medium tracking-[0.25em] uppercase opacity-90 mb-8">
            Onboarding
          </p>

          <ul className="space-y-6">
            {items.map((it) => (
              <li key={it.to} className="flex items-center gap-3">
                <StepIcon done={it.done} />
                <NavLink
                  to={it.to}
                  className={({ isActive }) =>
                    `text-sm font-light ${isActive ? "text-(--text-primary)" : "text-(--text-secondary)"} hover:text-(--text-primary)`
                  }
                >
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-8 border-t border-(--border)">
            <p className="text-xs text-(--text-muted) leading-relaxed">
              Current route: <span className="break-all">{location.pathname}</span>
            </p>
          </div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-73px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
