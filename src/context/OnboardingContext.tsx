import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";

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

const Ctx = createContext<OnboardingContextValue | null>(null);

const DEFAULT_STATE: OnboardingState = {
  awsConnected: false,
  contextAssigned: false,
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  const value = useMemo<OnboardingContextValue>(() => {
    return {
      state,
      setTerraformUpload: ({ key, filename }) =>
        setState((s) => ({ ...s, terraformUploadKey: key, terraformFilename: filename })),
      setAwsConnected: (v) => setState((s) => ({ ...s, awsConnected: v })),
      setContextAssigned: (v) => setState((s) => ({ ...s, contextAssigned: v })),
      reset: () => setState(DEFAULT_STATE),
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
