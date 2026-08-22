import type { useTranslation } from "@/lib/hook/useTranslation";

type Translations = ReturnType<typeof useTranslation>;

// Single source of truth for the "Complete Your Store Setup" wizard's steps
// — shared by the wizard itself (src/app/components/admin/completeSetup/
// CompleteSetupWizard.tsx) and the dashboard banner that nudges toward it
// (src/app/components/admin/common/SetupChecklistBanner.tsx), so the two
// never drift out of sync on what the steps are or what they're called.
export const SETUP_STEP_IDS = [
  "identity",
  "description",
  "settings",
  "social",
  "shipping",
  "policies",
] as const;

export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export function getSetupStepTitle(t: Translations, id: SetupStepId): string {
  switch (id) {
    case "identity":
      return t.completeSetup.identityTitle;
    case "description":
      return t.completeSetup.step1Title;
    case "settings":
      return t.completeSetup.step2Title;
    case "social":
      return t.completeSetup.step3Title;
    case "shipping":
      return t.completeSetup.step4Title;
    case "policies":
      return t.completeSetup.step5Title;
  }
}

export function isSetupStepId(value: string): value is SetupStepId {
  return (SETUP_STEP_IDS as readonly string[]).includes(value);
}
