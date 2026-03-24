import { Link } from "react-router-dom";
import { useState } from "react";
import { useOnboarding } from "../context/OnboardingContext";
import { CheckSquare } from "lucide-react";

export default function SetContextPage() {
  const { state, setContextAssigned } = useOnboarding();
  const [contextText, setContextText] = useState("");

  return (
    <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28">
      <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
        Set context
      </h2>

      <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
        Assigning context to AWS environment goes here (HIPAA, FERPA, etc.).
      </p>

      {/* TODO: wire this context input to backend persistence and downstream analysis flow. */}

      <div className="mb-10">
        <label
          htmlFor="context-input"
          className="block text-xs tracking-[0.1em] uppercase text-(--text-secondary) mb-3"
        >
          Context Input
        </label>
        <textarea
          id="context-input"
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          placeholder="Example: This AWS account handles HIPAA-regulated patient data and must enforce strict encryption, logging, and least-privilege IAM."
          className="w-full min-h-36 px-4 py-3 bg-black/30 border border-(--input-border) focus:border-(--input-focus) outline-none text-sm text-(--text-primary) placeholder:text-(--text-secondary)"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setContextAssigned(true)}
          className="px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        >
          Mark Context Assigned (demo)
        </button>

        <Link
          to="/uploads"
          className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
        >
          Go to Uploads
        </Link>
      </div>

      {state.contextAssigned && (
        <p className="mt-6 text-sm text-(--text-primary) flex items-center gap-2">
          <CheckSquare className="w-4 h-4" /> Context assigned (demo state)
        </p>
      )}
    </div>
  );
}
