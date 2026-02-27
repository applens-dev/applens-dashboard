import { Link } from "react-router-dom";
import { useOnboarding } from "../context/OnboardingContext";

export default function SetContextPage() {
  const { state, setContextAssigned } = useOnboarding();

  return (
    <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28">
      <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
        Set context
      </h2>

      <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
        Assigning context to AWS environment goes here (HIPAA, FERPA, etc.).
        For Sprint 1 MVP, this is a placeholder screen that matches the design.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setContextAssigned(true)}
          className="px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        >
          Mark Context Assigned (demo)
        </button>

        <Link
          to="/dashboard"
          className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
        >
          Go to Dashboard
        </Link>
      </div>

      {state.contextAssigned && (
        <p className="mt-6 text-sm text-(--text-primary)">✅ Context assigned (demo state)</p>
      )}
    </div>
  );
}
