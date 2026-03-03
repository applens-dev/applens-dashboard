import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { presignTerraformUpload, uploadFileToPresignedUrl } from "../api/uploads";
import { useOnboarding } from "../context/OnboardingContext";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (Sprint 1 MVP design)

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
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".tf") ||
    name.endsWith(".tfvars") ||
    name.endsWith(".zip") ||
    name.endsWith(".tar") ||
    name.endsWith(".tar.gz") ||
    name.endsWith(".tgz")
  );
}

export default function ImportTerraformPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { state, setTerraformUpload } = useOnboarding();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "presigning" | "uploading" | "done">("idle");
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
      setStatus("presigning");
      setProgress(0);

      const presign = await presignTerraformUpload({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      });

      setStatus("uploading");

      await uploadFileToPresignedUrl({
        url: presign.url,
        file,
        onProgress: (p) => setProgress(p),
      });

      setTerraformUpload({ key: presign.s3Key, filename: file.name });
      setStatus("done");
    } catch (e: any) {
      setStatus("idle");
      setProgress(0);
      setError(e?.message ?? "Upload failed.");
    }
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-10 sm:px-16 lg:px-20 pt-20">
        <h2 className="text-3xl sm:text-4xl font-semibold text-(--text-primary) mb-2">
          Upload your <span className="font-semibold">Terraform</span> files below.
        </h2>
        <p className="text-sm text-(--text-secondary) font-light mb-10">
          Note that your IaC files must be below 10 MB.
        </p>

        <div
          className={`rounded-xl border-2 border-dashed ${
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
            <div className="mx-auto w-14 h-14 rounded-2xl border border-(--border) bg-white/3 flex items-center justify-center mb-6">
              <span className="text-2xl">⬆️</span>
            </div>

            <p className="text-lg sm:text-xl font-light text-(--text-primary) mb-2">
              {helperText}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 disabled:opacity-50"
              >
                Browse
              </button>

              <button
                type="button"
                disabled={isBusy || !file}
                onClick={startUpload}
                className="px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100 disabled:opacity-50"
              >
                {status === "presigning"
                  ? "Preparing..."
                  : status === "uploading"
                    ? `Uploading ${progress}%`
                    : status === "done"
                      ? "Uploaded"
                      : "Upload"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) validateAndSetFile(picked);
              }}
            />
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-300">{error}</p>}

        {status === "done" && state.terraformUploadKey && (
          <div className="mt-8 border border-(--border) bg-white/2 rounded-xl p-5">
            <p className="text-sm text-(--text-primary) mb-2">
              ✅ Uploaded: <span className="font-medium">{state.terraformFilename}</span>
            </p>
            <p className="text-xs text-(--text-muted) break-all">
              S3 key: {state.terraformUploadKey}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/onboarding/connect-aws"
                className="inline-flex justify-center px-7 py-3 bg-white text-black text-xs font-medium tracking-[0.12em] uppercase hover:bg-gray-100"
              >
                Continue to Connect AWS
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex justify-center px-7 py-3 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100"
              >
                Skip to Dashboard (demo)
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
