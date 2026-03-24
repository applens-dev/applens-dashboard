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
        key,
        filename,
      }: {
        key: string;
        filename: string;
      }) =>
        setState((s) => ({
          ...s,
          terraformUploadKey: key,
          terraformFilename: filename,
        })),
      setAwsConnected: (v: boolean) =>
        setState((s) => ({ ...s, awsConnected: v })),
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
