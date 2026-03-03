import Header from "../components/Header";
import { Link } from "react-router-dom";

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header />

      <div className="px-10 sm:px-16 lg:px-20 pt-20 max-w-4xl">
        <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
          Use cases
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold mb-6">
          What AppLens helps with
        </h2>

        <ul className="space-y-4 text-(--text-secondary) font-light">
          <li>• Upload IaC/Terraform to scan and build system context.</li>
          <li>• Correlate vulnerabilities to deployed components.</li>
          <li>• Produce remediation guidance and infra/code changes.</li>
        </ul>

        <div className="mt-10">
          <Link
            to="/login"
            className="inline-flex px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
