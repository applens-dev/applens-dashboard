import { createContext, useContext } from "react";

export type OnboardingState = {
  terraformUploadKey?: string;
  terraformFilename?: string;
  awsConnected: boolean;
  contextAssigned: boolean;
};

type OnboardingContextValue = {
  state: OnboardingState;
  setTerraformUpload: (args: { key: string; filename: string }) => void;
  setAwsConnected: (v: boolean) => void;
  setContextAssigned: (v: boolean) => void;
  reset: () => void;
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  awsConnected: false,
  contextAssigned: false,
};
export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
