import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  completeTerraformUpload,
  presignTerraformUpload,
  uploadFileToPresignedUrl,
} from "../api/uploads";
import { useOnboarding } from "../context/OnboardingContext";
import { CheckSquare, CloudUpload } from "lucide-react";
import AppButton from "../components/AppButton";

const MAX_BYTES = 10 * 1024 * 1024;

const SUPPORTED_FILE_TYPES: Record<string, string> = {
  ".tf": "text/plain",
  ".tfvars": "text/plain",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".tgz": "application/gzip",
  ".tar.gz": "application/gzip",
};

function prettyBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isTerraformLikeFile(file: File) {
  return getSupportedContentType(file.name) !== null;
}

function getSupportedContentType(filename: string): string | null {
  const name = filename.toLowerCase();
  const suffixes = Object.keys(SUPPORTED_FILE_TYPES).sort(
    (a, b) => b.length - a.length,
  );

  const matchedSuffix = suffixes.find((suffix) => name.endsWith(suffix));
  return matchedSuffix ? SUPPORTED_FILE_TYPES[matchedSuffix] : null;
}

export default function ImportTerraformPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { state, setTerraformUpload } = useOnboarding();
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } =
    useAuth0();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("default");
  const [status, setStatus] = useState<
    "idle" | "presigning" | "uploading" | "done"
  >("idle");
  const [progress, setProgress] = useState<number>(0);

  const isBusy = status === "presigning" || status === "uploading";

  const helperText = useMemo(() => {
    if (!file) return "Drag and drop Terraform files or Browse.";
    return `${file.name} • ${prettyBytes(file.size)}`;
  }, [file]);

  function validateAndSetFile(next: File) {
    if (next.size > MAX_BYTES) {
      setError(`File too large. Max is ${prettyBytes(MAX_BYTES)}.`);
      setFile(null);
      return;
    }

    if (!isTerraformLikeFile(next)) {
      setError("Unsupported file type. Use .tf, .tfvars, .zip, .tar, .tgz.");
      setFile(null);
      return;
    }

    setError(null);
    setFile(next);
  }

  async function startUpload() {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    try {
      setError(null);
      setStatus("presigning");
      setProgress(0);

      if (!isAuthenticated) {
        await loginWithRedirect({
          appState: {
            returnTo: "/onboarding/import-terraform",
          },
        });
        return;
      }

      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const contentType =
        getSupportedContentType(file.name) || "application/octet-stream";

      const presign = await presignTerraformUpload(
        {
          filename: file.name,
          name: uploadName.trim() || "default",
          contentType,
        },
        accessToken,
      );

      setStatus("uploading");

      await uploadFileToPresignedUrl(
        presign.url,
        file,
        (p: number) => {
          setProgress(p);
        },
        contentType,
      );

      await completeTerraformUpload(
        presign.uploadId,
        accessToken,
      );

      setTerraformUpload({
        uploadId: presign.uploadId,
        filename: file.name,
        name: uploadName.trim() || "default",
      });

      setStatus("done");
    } catch (e: unknown) {
      setStatus("idle");
      setProgress(0);
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  function handleSkip() {
    if (!state.terraformUploadId) {
      setTerraformUpload({
        uploadId: "skipped",
        filename: "skipped",
        name: "skipped",
      });
    }
    navigate("/onboarding/connect-aws");
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-20">
        <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-4">
          Step 1
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-2">
          Upload your <span className="font-semibold">Terraform</span> files
          below.
        </h2>

        <p className="text-sm text-(--text-secondary) font-light mb-10">
          Note that your IaC files must be below 10 MB.
        </p>

        <div className="mb-6 flex justify-end">
          <AppButton onClick={handleSkip} variant="outline">
            Skip
          </AppButton>
        </div>

        <div className="mb-6">
          <label
            htmlFor="terraform-upload-name"
            className="block text-[11px] font-medium tracking-[0.12em] uppercase text-(--text-muted) mb-2"
          >
            Terraform Config Name
          </label>
          <input
            id="terraform-upload-name"
            type="text"
            value={uploadName}
            disabled={isBusy}
            onChange={(e) => setUploadName(e.target.value)}
            className="w-full border border-(--border) bg-white/2 px-4 py-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--input-focus) disabled:opacity-60"
            placeholder="default"
          />
        </div>

        <div
          className={`border-2 border-dashed ${
            isDragging ? "border-white/40" : "border-white/20"
          } bg-white/2 min-h-[320px] flex items-center justify-center text-center px-8`}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isBusy) return;
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isBusy) return;
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (isBusy) return;
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) validateAndSetFile(dropped);
          }}
        >
          <div className="w-full">
            <div className="mx-auto w-14 h-14 border border-(--border) bg-white/3 flex items-center justify-center mb-6">
              <span className="text-2xl">
                <CloudUpload />
              </span>
            </div>

            <p className="text-lg sm:text-xl font-light text-(--text-primary) mb-2">
              {helperText}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <AppButton
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Browse
              </AppButton>

              <AppButton
                disabled={isBusy || !file}
                onClick={startUpload}
                variant="primary"
              >
                {status === "presigning"
                  ? "Preparing..."
                  : status === "uploading"
                    ? `Uploading ${progress}%`
                    : status === "done"
                      ? "Uploaded"
                      : "Upload"}
              </AppButton>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".tf,.tfvars,.zip,.tar,.tgz,.tar.gz"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) validateAndSetFile(picked);
              }}
            />
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-300">{error}</p>}

        {status === "done" && state.terraformUploadId && (
          <div className="mt-8 border border-(--border) bg-white/2 p-5">
            <p className="text-sm text-(--text-primary) mb-2 flex gap-2 items-center">
              <CheckSquare className="w-4 h-4 text-green-500" /> Uploaded:
              <span className="font-medium">{state.terraformFilename}</span>
            </p>
            <p className="text-xs text-(--text-secondary)">
              Name: <span className="font-medium">{state.terraformUploadName}</span>
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/onboarding/connect-aws"
                className="inline-flex justify-center px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
              >
                Continue to Connect AWS
              </Link>

              <Link
                to="/home"
                className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
              >
                Skip to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
