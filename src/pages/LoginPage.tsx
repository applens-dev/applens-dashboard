import Header from "../components/Header";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header />

      <div className="px-10 sm:px-16 lg:px-20 pt-24 max-w-lg">
        <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
          Log in
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
          Demo login
        </h2>
        <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
          Sprint 1 MVP doesn’t need real auth yet. Click below to enter onboarding.
        </p>

        <Link
          to="/onboarding/import-terraform"
          className="inline-flex px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        >
          Continue to Onboarding
        </Link>
      </div>
    </div>
  );
}
