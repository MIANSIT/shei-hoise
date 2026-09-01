"use client";

import { Button } from "antd";
import { Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AdminAuthIllustration } from "@/app/components/layout/auth/AdminAuthIllustration";

import {
  CreateUserType,
  createUserSchema,
} from "@/lib/schema/onboarding/user.schema";
import { Currency, StoreStatus, USER_TYPES } from "@/lib/types/enums";
import {
  useStepForm,
  Step as StepType,
} from "@/lib/hook/onboarding/useStepForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useGsapScope } from "@/lib/gsap/useGsapScope";
import { gsap } from "gsap";

import UserInformation, {
  AccountValidationReason,
} from "@/app/components/onboarding/createStore/UserInformation";
import StoreInformation from "@/app/components/onboarding/createStore/StoreInformation";
import VerifyEmail from "@/app/components/onboarding/createStore/VerifyEmail";

interface StoreCreateFormProps {
  onSubmit: (data: CreateUserType, resetForm: () => void) => Promise<void>;
  loading?: boolean;
}

export default function StoreCreateForm({
  onSubmit,
  loading = false,
}: StoreCreateFormProps) {
  const [isAccountStepValid, setIsAccountStepValid] = useState(false);
  const [accountValidationReason, setAccountValidationReason] =
    useState<AccountValidationReason>(null);
  const [accountValidationAttempt, setAccountValidationAttempt] = useState(0);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const notify = useSheiNotification();
  const t = useTranslation();

  const form = useForm<CreateUserType>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      user_type: USER_TYPES.STORE_OWNER,
      store: {
        store_name: "",
        store_slug: "",
        short_description: "",
        status: StoreStatus.TRIAL,
        contact_email: "",
        contact_phone: "",
        business_address: "",
        business_license: "",
        tax_id: "",
        logo_url: "",
        banner_url: "",
      },
      store_settings: {
        currency: Currency.BDT,
        tax_rate: 0,
        // No default shipping method — a placeholder fee would mislead
        // customers before the merchant has set real shipping options.
        // They configure their own real shipping in the Complete Setup
        // wizard's Shipping step (embeds ShippingManager directly).
        shipping_fees: [],
        min_order_amount: 0,
        processing_time_days: 1,
        return_policy_days: 7,
        terms_and_conditions: "",
        privacy_policy: "",
        store_social_media: {
          facebook_link: "",
          instagram_link: "",
          youtube_link: "",
          twitter_link: "",
        },
      },
      profile: { country: "Bangladesh" },
      is_active: true,
    },
  });

  const { control, handleSubmit, trigger, reset, watch } = form;
  const email = watch("email");

  const USER_INFO_STEP = 1;

  const stepsList: StepType[] = [
    {
      title: t.onboarding.stepStoreInfo,
      content: <StoreInformation control={control} />,
      fields: [
        "store.store_name",
        "store.store_slug",
        "store.short_description",
        "store.logo_url",
        "store.banner_url",
        "store.contact_email",
        "store.contact_phone",
        "store.business_address",
      ] as Path<CreateUserType>[],
    },
    {
      title: t.onboarding.stepUserInfo,
      content: (
        <UserInformation
          control={control}
          formState={form}
          onValidationChange={(isValid, reason) => {
            setIsAccountStepValid(isValid);
            setAccountValidationReason(reason);
          }}
          validationAttempt={accountValidationAttempt}
        />
      ),
      fields: [
        "user_type",
        "email",
        "first_name",
        "last_name",
        "phone",
        "profile.country",
        "password",
      ] as Path<CreateUserType>[],
    },
    {
      title: t.onboarding.stepVerifyEmail,
      content: (
        <VerifyEmail email={email} onValidationChange={setIsEmailVerified} />
      ),
      fields: [] as Path<CreateUserType>[],
    },
  ];

  const {
    steps,
    currentStep,
    next,
    prev,
    goTo,
    isFirst,
    isLast,
    currentContent,
    currentFields,
  } = useStepForm(stepsList);

  const reasonMessages: Record<Exclude<AccountValidationReason, null>, string> = {
    confirm_required: t.onboarding.confirmPasswordRequired,
    confirm_mismatch: t.onboarding.passwordMismatch,
    terms_required: t.onboarding.mustAcceptTerms,
  };

  // Confirm-password and terms live as local state inside UserInformation
  // (not RHF fields), so trigger() alone never catches them — this is the
  // one shared gate both step navigation and final submit rely on.
  const blockedByAccountValidation = () => {
    if (isAccountStepValid) return false;
    setAccountValidationAttempt((count) => count + 1);
    notify.error(
      accountValidationReason
        ? reasonMessages[accountValidationReason]
        : t.onboarding.completePassword,
    );
    return true;
  };

  const handleNext = async () => {
    if (!currentFields || currentFields.length === 0) return;
    const isStepValid = await trigger(currentFields, { shouldFocus: true });
    if (!isStepValid) {
      notify.error(t.onboarding.fillRequired);
      shakePanel();
      return;
    }
    if (currentStep === USER_INFO_STEP && blockedByAccountValidation()) return;
    withDirection(currentStep + 1, next);
  };

  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      withDirection(stepIndex, () => goTo(stepIndex));
    } else if (stepIndex === currentStep) {
      return;
    } else {
      const isStepValid = await trigger(currentFields, { shouldFocus: true });
      if (!isStepValid) {
        notify.error(t.onboarding.fillRequired);
        return;
      }
      if (currentStep === USER_INFO_STEP && blockedByAccountValidation()) return;
      withDirection(stepIndex, () => goTo(stepIndex));
    }
  };

  const onSubmitForm = (data: CreateUserType) => {
    if (blockedByAccountValidation()) return;
    if (!isEmailVerified) {
      notify.error(t.onboarding.verifyRequired);
      return;
    }
    onSubmit(data, reset);
  };

  // Which way the last step change went, so the panel slides in from the side
  // it came from. Direction is what turns two panels into "steps" — a merchant
  // sees whether they advanced or went back without reading anything.
  const directionRef = useRef<1 | -1>(1);
  const previousStepRef = useRef(currentStep);

  const panelScope = useGsapScope(
    ({ root, reduced, gsap: g }) => {
      const direction = directionRef.current;

      if (reduced) {
        g.set(root, { opacity: 1, x: 0 });
        return;
      }

      // First render is not a transition — a wizard that slides in before the
      // merchant has done anything reads as jitter, not as feedback.
      if (previousStepRef.current === currentStep) {
        g.set(root, { opacity: 1, x: 0 });
        return;
      }

      g.fromTo(
        root,
        { opacity: 0, x: 26 * direction },
        { opacity: 1, x: 0, duration: 0.34, ease: "power3.out" },
      );
    },
    [currentStep],
  );

  const progressScope = useGsapScope(
    ({ q, reduced, gsap: g }) => {
      // Three steps is short enough that showing the remaining distance
      // shrink is what stops people abandoning halfway.
      const pct = (currentStep / (stepsList.length - 1)) * 100;
      g.to(q("[data-progress-fill]"), {
        width: `${pct}%`,
        duration: reduced ? 0 : 0.5,
        ease: "power2.out",
      });
    },
    [currentStep],
  );

  // Page-load entrance, the same idea as the landing hero: a merchant arriving
  // here has just clicked "Start for Free", and an instant wall of form fields
  // is a harder thing to land on than one that assembles. Order matters — the
  // reassurance (trust strip, brand panel) resolves before the work does.
  const enterScope = useGsapScope(({ q, reduced, gsap: g }) => {
    const targets = q("[data-enter]");

    if (reduced) {
      g.set(targets, { opacity: 1, y: 0 });
      return;
    }

    g.timeline({ defaults: { ease: "power3.out" }, delay: 0.05 })
      .from(q("[data-enter='trust']"), { y: -10, opacity: 0, duration: 0.4 })
      .from(q("[data-enter='aside']"), { x: -18, opacity: 0, duration: 0.55 }, "-=0.2")
      .from(q("[data-enter='steps']"), { y: 12, opacity: 0, duration: 0.45 }, "-=0.35")
      .from(q("[data-enter='panel']"), { y: 18, opacity: 0, duration: 0.55 }, "-=0.3")
      // The first field is where the merchant has to act, so it arrives last
      // and alone — nothing else is moving by the time it lands.
      .from(q("[data-enter='progress']"), { opacity: 0, duration: 0.35 }, "-=0.4");
  });

  /**
   * A short horizontal shake on the form panel when a step fails validation.
   *
   * The toast alone is easy to miss on mobile, where it can sit above the
   * fold while the merchant is looking at the button they just pressed. This
   * puts the feedback where their attention already is, and scrolls the first
   * invalid field into view — react-hook-form focuses it, but focus does not
   * guarantee it is on screen inside a scrolling panel.
   */
  const shakePanel = () => {
    const panel = panelScope.current;
    if (!panel) return;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(
        panel,
        { x: -8 },
        { x: 0, duration: 0.45, ease: "elastic.out(1, 0.35)" },
      );
    }

    panel
      .querySelector<HTMLElement>("[aria-invalid='true'], .ant-form-item-has-error")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /**
   * Marks which way the wizard is about to move, so the panel animation knows
   * its direction before React re-renders with the new step.
   */
  const withDirection = (target: number, move: () => void) => {
    directionRef.current = target > currentStep ? 1 : -1;
    previousStepRef.current = currentStep;
    move();
  };

  const sidebarBullets = [
    t.onboarding.sidebarBullet1,
    t.onboarding.sidebarBullet2,
    t.onboarding.sidebarBullet3,
    t.onboarding.sidebarBullet4,
    t.onboarding.sidebarBullet5,
    t.onboarding.sidebarBullet6,
  ];

  return (
    <div
      ref={enterScope as React.RefObject<HTMLDivElement>}
      className='mx-auto flex w-full max-w-6xl flex-col p-4 md:p-6'
    >
      {/* Trust strip */}
      <div
        data-enter='trust'
        className='mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground'
      >
        <ShieldCheck className='h-3.5 w-3.5 text-chart-2' />
        <span>
          {t.onboarding.trustStripPrefix}
          <span className='font-medium text-foreground'>{t.onboarding.trustStripBold}</span>
          {t.onboarding.trustStripSuffix}
        </span>
      </div>

      <div className='flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center'>
        <div className='flex w-full max-w-2xl flex-col items-center'>
          {/* Step indicator — centered above the form itself, not the whole row */}
          <div
            data-enter='steps'
            className='mb-8 flex items-center justify-center gap-3 sm:gap-4'
          >
            {steps.map((step, idx) => (
              <div key={idx} className='flex items-center gap-3 sm:gap-4'>
                <button
                  type='button'
                  onClick={() => handleStepClick(idx)}
                  className='flex flex-col items-center gap-2'
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200 ${
                      currentStep === idx
                        ? "bg-chart-2 text-white ring-4 ring-chart-2/20"
                        : idx < currentStep
                        ? "border-2 border-chart-2 bg-chart-2/10 text-chart-2"
                        : "border-2 border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`whitespace-nowrap text-xs font-medium ${
                      currentStep === idx
                        ? "text-chart-2"
                        : idx < currentStep
                        ? "text-chart-2/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>

                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 rounded-full transition-colors duration-200 sm:w-24 ${
                      idx < currentStep ? "bg-chart-2" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress — how much is left, not just where you are */}
          <div
            ref={progressScope as React.RefObject<HTMLDivElement>}
            data-enter='progress'
            className='mb-6 w-full'
          >
            <div className='h-1 w-full overflow-hidden rounded-full bg-border'>
              <div
                data-progress-fill
                className='h-full rounded-full bg-chart-2'
                style={{ width: 0 }}
              />
            </div>
            <p className='mt-2 text-center text-xs text-muted-foreground'>
              {t.onboarding.stepCounterPrefix} {currentStep + 1}{" "}
              {t.onboarding.stepCounterOf} {stepsList.length}
            </p>
          </div>

          {/* Form Content */}
          <div
            ref={panelScope as React.RefObject<HTMLDivElement>}
            data-enter='panel'
            className='w-full rounded-3xl border border-chart-2/10 bg-card p-6 shadow-2xl shadow-chart-2/10 md:p-10'
          >
            {currentContent}

            {/* Navigation Buttons */}
            <div className='mt-8 flex items-center justify-between'>
              {!isFirst && (
                <Button
                  onClick={() => withDirection(currentStep - 1, prev)}
                  type='default'
                  className='rounded-full px-6'
                >
                  {t.onboarding.previous}
                </Button>
              )}

              <div className='flex-1 flex justify-end'>
                {!isLast ? (
                  <Button
                    type='primary'
                    onClick={handleNext}
                    htmlType='button'
                    className='rounded-full px-8 font-semibold shadow-lg shadow-chart-2/30'
                    style={{ backgroundColor: "var(--chart-2)", border: "none" }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--badge)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--chart-2)";
                    }}
                  >
                    {t.onboarding.next}
                  </Button>
                ) : (
                  <Button
                    type='primary'
                    onClick={handleSubmit(onSubmitForm)}
                    loading={loading}
                    disabled={!isEmailVerified}
                    title={!isEmailVerified ? t.onboarding.verifyRequired : undefined}
                    className='rounded-full px-8 py-2 font-semibold shadow-lg shadow-chart-2/30 transition-colors duration-200'
                    style={
                      isEmailVerified
                        ? { backgroundColor: "var(--chart-2)", border: "none" }
                        : undefined
                    }
                    onMouseEnter={(e) => {
                      if (!isEmailVerified) return;
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--badge)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isEmailVerified) return;
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "var(--chart-2)";
                    }}
                  >
                    {t.onboarding.requestOnboard}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Brand panel — desktop/wide screens only, fills the space beside the form */}
        <aside
          data-enter='aside'
          className='sticky top-6 hidden w-85 shrink-0 flex-col lg:order-first lg:flex'
        >
          <span className='text-xs font-bold uppercase tracking-widest text-chart-2'>
            {t.onboarding.sidebarEyebrow}
          </span>
          <h2 className='mt-2 text-2xl font-semibold text-foreground'>
            {t.onboarding.sidebarHeadline}
          </h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            {t.onboarding.sidebarSubtext}
          </p>

          <ul className='mt-5 space-y-3'>
            {sidebarBullets.map((bullet) => (
              <li key={bullet} className='flex items-start gap-2 text-sm text-foreground'>
                <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-chart-2' />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className='mt-6 aspect-4/3 overflow-hidden rounded-3xl shadow-2xl shadow-chart-2/20 ring-1 ring-chart-2/15'>
            <AdminAuthIllustration />
          </div>
        </aside>
      </div>
    </div>
  );
}
