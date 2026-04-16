import { Link } from "react-router-dom";
import { useState } from "react";
import { useOnboarding } from "../context/OnboardingContext";
import { CheckSquare, FileText } from "lucide-react";

export default function SetContextPage() {
  const { state, setContextAssigned } = useOnboarding();
  const [contextText, setContextText] = useState("");

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-20">
        <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
          Step 3
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
          Set Context
        </h2>

        <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
          Add security and compliance context for this environment so analysis and
          remediation can be tuned to your requirements.
        </p>

        {/* TODO: wire this context input to backend persistence and downstream analysis flow. */}
        <div className="mb-8 border border-(--border) bg-white/2 p-5 sm:p-6">
          <p className="text-xs tracking-[0.12em] uppercase text-(--text-muted) mb-3">
            Step 3.1
          </p>
          <h3 className="text-lg font-semibold text-(--text-primary) mb-2">
            Environment Context
          </h3>
          <p className="text-sm text-(--text-secondary) font-light mb-5">
            Include frameworks, data sensitivity, and controls required for this
            account.
          </p>

          <div className="mb-6">
            <label
              htmlFor="context-input"
              className="block text-[11px] tracking-[0.12em] uppercase text-(--text-muted) mb-2"
            >
              Context Input
            </label>
            <textarea
              id="context-input"
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Example: This AWS account handles HIPAA-regulated patient data and must enforce strict encryption, logging, and least-privilege IAM."
              className="w-full min-h-40 px-4 py-3 bg-black/20 border border-(--border) focus:border-white/25 outline-none text-sm text-(--text-primary) placeholder:text-(--text-secondary)"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setContextAssigned(true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
            >
              <FileText className="w-4 h-4" />
              Mark Context Assigned
            </button>

            <Link
              to="/home"
              className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
            >
              Go to Home
            </Link>
          </div>
        </div>

        {state.contextAssigned && (
          <div className="mb-8 border border-green-500/30 bg-green-500/8 p-5 sm:p-6">
            <p className="text-sm text-(--text-primary) flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-500" />
              Context assigned successfully.
            </p>
            <p className="text-xs text-(--text-secondary) mt-2">
              You can continue to the dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
