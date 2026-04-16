import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { useOnboarding } from "../context/OnboardingContext";
import { CheckSquare, AlertCircle, Copy, Download, Loader } from "lucide-react";
import { getMe, verifyRole, type UserProfile } from "../api/user";

const APP_LENS_BUCKET_ARN = "arn:aws:s3:::applens-dev-live-inventory-us-east-2";

export default function ConnectAwsPage() {
  const { getAccessTokenSilently } = useAuth0();
  const { state, setAwsConnected, setRoleArn } = useOnboarding();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [roleArnInput, setRoleArnInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getAccessTokenSilently();
        const profile = await getMe(token);
        setUserProfile(profile);
        if (profile.awsConnected) {
          setAwsConnected(true);
          setRoleArn(profile.roleArn || "");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setAwsConnected, setRoleArn]);

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/customer-scanning-role.yaml";
    link.download = "customer-scanning-role.yaml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerifyRole = async () => {
    if (!roleArnInput.trim()) {
      setVerifyError("Please enter a Role ARN");
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const token = await getAccessTokenSilently();
      const response = await verifyRole(roleArnInput, token);

      if (response.success) {
        setAwsConnected(true);
        setRoleArn(roleArnInput);
        setRoleArnInput("");
      } else {
        setVerifyError(response.message);
      }
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Failed to verify role"
      );
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-20 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-20">
        <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
          Error Loading Profile
        </h2>
        <p className="text-sm text-(--text-secondary)">
          Unable to load your user profile. Please refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-20">
        <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
          Step 2
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
          Connect AWS Account
        </h2>
        <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-10">
          Deploy the CloudFormation template in your AWS account, then verify the
          generated role ARN to enable scanning.
        </p>

        <div className="mb-8 border border-(--border) bg-white/2 p-5 sm:p-6">
          <p className="text-xs tracking-[0.12em] uppercase text-(--text-muted) mb-3">
            Step 2.1
          </p>
          <h3 className="text-lg font-semibold text-(--text-primary) mb-2">
            Deploy CloudFormation Template
          </h3>
          <p className="text-sm text-(--text-secondary) font-light mb-5">
            Use the values below as template parameters during deployment.
          </p>

          <div className="space-y-3 mb-6">
            <div className="p-3 bg-black/25 border border-(--border)">
              <label className="text-[11px] tracking-[0.1em] uppercase text-(--text-muted) block mb-2">
                AppLens Account ID
              </label>
              <div className="flex items-start justify-between gap-2">
                <code className="text-sm text-(--text-primary) break-all">
                  {userProfile.appLensAccountId}
                </code>
                <button
                  onClick={() =>
                    handleCopyToClipboard(userProfile.appLensAccountId, "accountId")
                  }
                  className="inline-flex items-center justify-center w-8 h-8 border border-(--input-focus) text-(--text-primary) hover:border-white/40"
                  title="Copy AppLens account ID"
                >
                  {copiedField === "accountId" ? (
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-black/25 border border-(--border)">
              <label className="text-[11px] tracking-[0.1em] uppercase text-(--text-muted) block mb-2">
                AppLens S3 Bucket ARN
              </label>
              <div className="flex items-start justify-between gap-2">
                <code className="text-sm text-(--text-primary) break-all">
                  {APP_LENS_BUCKET_ARN}
                </code>
                <button
                  onClick={() => handleCopyToClipboard(APP_LENS_BUCKET_ARN, "bucketArn")}
                  className="inline-flex items-center justify-center w-8 h-8 border border-(--input-focus) text-(--text-primary) hover:border-white/40"
                  title="Copy AppLens S3 bucket ARN"
                >
                  {copiedField === "bucketArn" ? (
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-500/8 border border-amber-500/30">
              <label className="text-[11px] tracking-[0.1em] uppercase text-(--text-muted) block mb-2">
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-amber-300" />
                  External ID (Keep Secret)
                </span>
              </label>
              <div className="flex items-start justify-between gap-2">
                <code className="text-sm text-(--text-primary) break-all">
                  {userProfile.externalId}
                </code>
                <button
                  onClick={() => handleCopyToClipboard(userProfile.externalId, "externalId")}
                  className="inline-flex items-center justify-center w-8 h-8 border border-(--input-focus) text-(--text-primary) hover:border-white/40"
                  title="Copy external ID"
                >
                  {copiedField === "externalId" ? (
                    <CheckSquare className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-amber-200 mt-3">
                Keep this value private. It is used to verify trust between your AWS
                account and AppLens.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
            <p className="text-xs text-(--text-secondary) font-light">
              Upload `customer-scanning-role.yaml` in CloudFormation and complete the
              stack creation.
            </p>
          </div>
        </div>

        {!state.awsConnected ? (
          <div className="mb-8 border border-(--border) bg-white/2 p-5 sm:p-6">
            <p className="text-xs tracking-[0.12em] uppercase text-(--text-muted) mb-3">
              Step 2.2
            </p>
            <h3 className="text-lg font-semibold text-(--text-primary) mb-2">
              Verify Role ARN
            </h3>
            <p className="text-sm text-(--text-secondary) font-light mb-5">
              Paste the role ARN from your CloudFormation stack outputs.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] tracking-[0.12em] uppercase text-(--text-muted) mb-2">
                Role ARN
              </label>
              <input
                type="text"
                placeholder="arn:aws:iam::123456789012:role/AppLensScanningRole-prod"
                value={roleArnInput}
                onChange={(e) => {
                  setRoleArnInput(e.target.value);
                  setVerifyError(null);
                }}
                disabled={verifying}
                className="w-full px-4 py-3 bg-black/30 border border-(--input-border) focus:border-(--input-focus) outline-none text-sm text-(--text-primary) placeholder:text-(--text-secondary)"
              />
            </div>

            {verifyError && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-300 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-200">Verification Failed</p>
                  <p className="text-xs text-red-300">{verifyError}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleVerifyRole}
              disabled={verifying || !roleArnInput.trim()}
              className="inline-flex items-center gap-2 px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying && <Loader className="w-4 h-4 animate-spin" />}
              {verifying ? "Verifying..." : "Verify Connection"}
            </button>
          </div>
        ) : (
          <div className="mb-8 border border-green-500/30 bg-green-500/8 p-5 sm:p-6">
            <p className="text-sm text-(--text-primary) flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-500" />
              AWS account connected successfully.
            </p>
            <p className="text-xs text-(--text-secondary) mt-2 break-all">
              Role ARN: <code className="text-green-300">{state.roleArn}</code>
            </p>
          </div>
        )}

        {state.awsConnected && (
          <div className="flex justify-end pb-10">
            <Link
              to="/onboarding/set-context"
              className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
            >
              Continue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
