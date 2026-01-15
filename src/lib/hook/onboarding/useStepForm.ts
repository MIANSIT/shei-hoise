import { useState } from "react";
import { Path } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { JSX } from "react/jsx-runtime";

export interface Step {
  title: string;
  content: JSX.Element;
  fields?: Path<CreateUserType>[];
}

export function useStepForm(steps: Step[]) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goTo = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  return {
    steps,
    currentStep,
    next,
    prev,
    goTo,
    isFirst: currentStep === 0,
    isLast: currentStep === steps.length - 1,
    currentContent: steps[currentStep].content,
    currentFields: steps[currentStep].fields || [],
  };
}
