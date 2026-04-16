import type React from "react";
import { useMemo, useState } from "react";
import {
  DEFAULT_ONBOARDING_STATE,
  OnboardingContext,
  type OnboardingState,
} from "./OnboardingContext";

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  const value = useMemo(() => {
    return {
      state,
      setTerraformUpload: ({
        uploadId,
        filename,
        name,
      }: {
        uploadId: string;
        filename: string;
        name: string;
      }) =>
        setState((s) => ({
          ...s,
          terraformUploadId: uploadId,
          terraformFilename: filename,
          terraformUploadName: name,
        })),
      setAwsConnected: (v: boolean) =>
        setState((s) => ({ ...s, awsConnected: v })),
      setRoleArn: (arn: string) =>
        setState((s) => ({ ...s, roleArn: arn })),
      setContextAssigned: (v: boolean) =>
        setState((s) => ({ ...s, contextAssigned: v })),
      reset: () => setState(DEFAULT_ONBOARDING_STATE),
    };
  }, [state]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
