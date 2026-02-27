import { Link } from "react-router-dom";
import { useOnboarding } from "../context/OnboardingContext";

export default function ConnectAwsPage() {
  const { state, setAwsConnected } = useOnboarding();

  return (
    <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28">
      <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
        Connect AWS
      </h2>

      <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
        Tutorial for connecting AppLens to your AWS environment goes here.
        For Sprint 1 MVP, this page is a placeholder to match the design flow.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setAwsConnected(true)}
          className="px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        >
          Mark AWS Connected (demo)
        </button>

        <Link
          to="/onboarding/set-context"
          className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
        >
          Continue
        </Link>
      </div>

      {state.awsConnected && (
        <p className="mt-6 text-sm text-(--text-primary)">✅ AWS connected (demo state)</p>
      )}
    </div>
  );
}
