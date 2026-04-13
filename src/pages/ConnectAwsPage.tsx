import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useOnboarding } from "../context/OnboardingContext";
import { CheckSquare, AlertCircle, Copy, Download, Loader } from "lucide-react";
import { getMe, verifyRole, type UserProfile } from "../api/user";

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
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28">
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
    <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-28">
      <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-4">
        Connect AWS Account
      </h2>

      <p className="text-sm text-(--text-secondary) font-light leading-relaxed mb-8">
        Deploy the CloudFormation template in your AWS account to grant AppLens
        permission to scan your infrastructure.
      </p>

      {/* Instructions Section */}
      <div className="mb-8 p-4 border border-(--input-border) rounded-lg bg-(--bg-secondary)">
        <h3 className="text-lg font-semibold text-(--text-primary) mb-4">
          CloudFormation Parameters
        </h3>

        <p className="text-xs text-(--text-secondary) mb-4">
          Use these pre-filled values when deploying the template:
        </p>

        {/* AppLens Account ID */}
        <div className="mb-4 p-3 bg-(--bg-primary) rounded border border-(--input-border)">
          <label className="text-xs font-medium text-(--text-secondary) block mb-1">
            AppLens Account ID
          </label>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm text-(--text-primary) break-all">
              {userProfile.appLensAccountId}
            </code>
            <button
              onClick={() =>
                handleCopyToClipboard(
                  userProfile.appLensAccountId,
                  "accountId"
                )
              }
              className="p-1 hover:bg-(--input-border) rounded"
              title="Copy to clipboard"
            >
              {copiedField === "accountId" ? (
                <CheckSquare className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* S3 Bucket ARN */}
        <div className="mb-4 p-3 bg-(--bg-primary) rounded border border-(--input-border)">
          <label className="text-xs font-medium text-(--text-secondary) block mb-1">
            AppLens S3 Bucket ARN
          </label>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm text-(--text-primary) break-all">
              arn:aws:s3:::applens-dev-live-inventory-us-east-2
            </code>
            <button
              onClick={() =>
                handleCopyToClipboard(
                  "arn:aws:s3:::applens-dev-live-inventory-us-east-2",
                  "bucketArn"
                )
              }
              className="p-1 hover:bg-(--input-border) rounded"
              title="Copy to clipboard"
            >
              {copiedField === "bucketArn" ? (
                <CheckSquare className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* External ID - with security warning */}
        <div className="p-3 bg-(--bg-primary) rounded border border-(--input-border) border-orange-500/30">
          <label className="text-xs font-medium text-(--text-secondary) block mb-1 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-orange-500" />
            External ID (Keep Secret)
          </label>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm text-(--text-primary) break-all font-mono">
              {userProfile.externalId}
            </code>
            <button
              onClick={() =>
                handleCopyToClipboard(userProfile.externalId, "externalId")
              }
              className="p-1 hover:bg-(--input-border) rounded"
              title="Copy to clipboard"
            >
              {copiedField === "externalId" ? (
                <CheckSquare className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            ⚠️ Do not share this External ID with anyone. It is a secret token
            used to verify your AWS account.
          </p>
        </div>
      </div>

      {/* Download Template Button */}
      <div className="mb-8">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
        >
          <Download className="w-4 h-4" />
          Download CloudFormation Template
        </button>
        <p className="text-xs text-(--text-secondary) mt-2">
          Save this file and deploy it in your AWS account with the parameters above.
        </p>
      </div>

      {/* ARN Input Section */}
      {!state.awsConnected ? (
        <div className="mb-8 p-4 border border-(--input-border) rounded-lg bg-(--bg-secondary)">
          <h3 className="text-lg font-semibold text-(--text-primary) mb-4">
            Complete the Connection
          </h3>

          <p className="text-sm text-(--text-secondary) mb-4">
            After deploying the CloudFormation template, paste the Role ARN from
            the outputs section:
          </p>

          <div className="mb-4">
            <label className="text-xs font-medium text-(--text-secondary) block mb-2">
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
              className="w-full px-3 py-2 text-sm bg-(--input-bg) border border-(--input-border) rounded text-(--text-primary) placeholder-text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-(--input-focus)"
            />
          </div>

          {verifyError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700">Verification Failed</p>
                <p className="text-xs text-red-600">{verifyError}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleVerifyRole}
            disabled={verifying || !roleArnInput.trim()}
            className="px-6 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {verifying && <Loader className="w-4 h-4 animate-spin" />}
            {verifying ? "Verifying..." : "Verify Connection"}
          </button>
        </div>
      ) : (
        <div className="mb-8 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
          <p className="text-sm text-(--text-primary) flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-green-500" />
            AWS account connected successfully!
          </p>
          <p className="text-xs text-(--text-secondary) mt-2">
            Role ARN: <code className="text-green-700">{state.roleArn}</code>
          </p>
        </div>
      )}

      {/* Navigation */}
      {state.awsConnected && (
        <div className="flex justify-end">
          <a
            href="/onboarding/set-context"
            className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
          >
            Continue
          </a>
        </div>
      )}
    </div>
  );
}
