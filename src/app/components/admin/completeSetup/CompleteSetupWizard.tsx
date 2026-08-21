"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { RichTextController } from "@/app/components/admin/dashboard/store-settings/storeCard/RichEditor";
import { ImageUploader } from "@/app/components/admin/dashboard/store-settings/storeCard/ImageUploader";
import { PillField, PillShell, PillTextArea } from "@/app/components/common/PillField";
import { CurrencySelect } from "@/app/components/common/CurrencySelect";
import { ShippingManager } from "@/app/components/shipping/ShippingManager";
import { getStoreMediaUrl } from "@/lib/utils/store/storeMediaCache";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  SETUP_STEP_IDS,
  getSetupStepTitle,
  isSetupStepId,
  type SetupStepId,
} from "@/lib/constants/setupSteps";
import type {
  StoreData,
  StoreSettings,
  StoreSocialMedia,
  UpdatedStoreData,
  UpdatedStoreSettings,
  UpdatedStoreSocialMedia,
} from "@/lib/types/store/store";

type StepId = SetupStepId;
const STEP_ORDER: StepId[] = [...SETUP_STEP_IDS];

interface IdentitySave {
  store_name: string;
  store_slug: string;
  logoFile?: File | null;
  bannerFile?: File | null;
  clearLogo?: boolean;
  clearBanner?: boolean;
}

interface Props {
  store: StoreData;
  settings: StoreSettings;
  socialMedia: StoreSocialMedia | null;
  storeSlug: string;
  onSaveIdentity: (data: IdentitySave) => Promise<boolean>;
  onSaveStore: (data: UpdatedStoreData) => Promise<boolean>;
  onSaveSettings: (data: UpdatedStoreSettings) => Promise<boolean>;
  onSaveSocialMedia: (data: UpdatedStoreSocialMedia) => Promise<boolean>;
  onProgressChange: (steps: string[]) => void;
  onFinish: () => void;
}

function restoreCompletedSteps(saved: string[] | null | undefined): Set<StepId> {
  return new Set((saved ?? []).filter(isSetupStepId));
}

const primaryBtn =
  "rounded-full bg-chart-2 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-chart-2/30 hover:bg-chart-2/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center";

const secondaryBtn =
  "rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 inline-flex items-center justify-center";

export default function CompleteSetupWizard({
  store,
  settings,
  socialMedia,
  storeSlug,
  onSaveIdentity,
  onSaveStore,
  onSaveSettings,
  onSaveSocialMedia,
  onProgressChange,
  onFinish,
}: Props) {
  const t = useTranslation();

  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(() =>
    restoreCompletedSteps(store.setup_progress),
  );
  const [activeStep, setActiveStep] = useState<StepId>(() => {
    const restored = restoreCompletedSteps(store.setup_progress);
    return STEP_ORDER.find((id) => !restored.has(id)) ?? "identity";
  });
  const [saving, setSaving] = useState(false);
  const finishedRef = useRef(false);

  const [storeName, setStoreName] = useState(store.store_name);
  const [storeSlugValue, setStoreSlugValue] = useState(store.store_slug);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  const [tagline, setTagline] = useState(store.short_description ?? "");
  const [description, setDescription] = useState(store.description ?? "");

  const [taxRate, setTaxRate] = useState(String(settings.tax_rate ?? 0));
  const [minOrder, setMinOrder] = useState(String(settings.min_order_amount ?? 0));
  const [processingDays, setProcessingDays] = useState(
    String(settings.processing_time_days ?? 0),
  );
  const [returnDays, setReturnDays] = useState(String(settings.return_policy_days ?? 0));
  const [freeShippingAt, setFreeShippingAt] = useState(
    settings.free_shipping_threshold != null ? String(settings.free_shipping_threshold) : "",
  );

  const [facebook, setFacebook] = useState(socialMedia?.facebook_link ?? "");
  const [instagram, setInstagram] = useState(socialMedia?.instagram_link ?? "");
  const [twitter, setTwitter] = useState(socialMedia?.twitter_link ?? "");
  const [youtube, setYoutube] = useState(socialMedia?.youtube_link ?? "");

  const [terms, setTerms] = useState(settings.terms_and_conditions ?? "");
  const [privacy, setPrivacy] = useState(settings.privacy_policy ?? "");

  const allComplete = completedSteps.size === STEP_ORDER.length;

  useEffect(() => {
    if (allComplete && !finishedRef.current) {
      finishedRef.current = true;
      onFinish();
    }
  }, [allComplete, onFinish]);

  const markComplete = (step: StepId) => {
    const next = new Set(completedSteps).add(step);
    setCompletedSteps(next);
    onProgressChange(Array.from(next));
    const nextStep = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
    if (nextStep) setActiveStep(nextStep);
  };

  const steps = STEP_ORDER.map((id) => ({ id, title: getSetupStepTitle(t, id) }));

  const handleSaveIdentity = async () => {
    setSaving(true);
    const ok = await onSaveIdentity({
      store_name: storeName,
      store_slug: storeSlugValue,
      logoFile,
      bannerFile,
      clearLogo: logoRemoved,
      clearBanner: bannerRemoved,
    });
    setSaving(false);
    if (ok) markComplete("identity");
  };

  const handleSaveDescription = async () => {
    setSaving(true);
    const ok = await onSaveStore({ short_description: tagline, description });
    setSaving(false);
    if (ok) markComplete("description");
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const ok = await onSaveSettings({
      tax_rate: Number(taxRate) || 0,
      min_order_amount: Number(minOrder) || 0,
      processing_time_days: Number(processingDays) || 0,
      return_policy_days: Number(returnDays) || 0,
      free_shipping_threshold: freeShippingAt === "" ? null : Number(freeShippingAt),
    });
    setSaving(false);
    if (ok) markComplete("settings");
  };

  const handleSaveSocial = async () => {
    setSaving(true);
    const ok = await onSaveSocialMedia({
      facebook_link: facebook || null,
      instagram_link: instagram || null,
      twitter_link: twitter || null,
      youtube_link: youtube || null,
    });
    setSaving(false);
    if (ok) markComplete("social");
  };

  const handleSavePolicies = async () => {
    setSaving(true);
    const ok = await onSaveSettings({
      terms_and_conditions: terms,
      privacy_policy: privacy,
    });
    setSaving(false);
    if (ok) markComplete("policies");
  };

  if (allComplete) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-chart-2/10 ring-2 ring-chart-2/30">
          <Check className="h-9 w-9 text-chart-2" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-foreground">
          {t.completeSetup.completeTitle}
        </h2>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          {t.completeSetup.completeSub}
        </p>
        <Link href="/dashboard" className={primaryBtn}>
          {t.completeSetup.backToDashboard}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Docket sidebar */}
      <aside className="lg:w-72 shrink-0">
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-chart-2">
            {t.completeSetup.progressLabel}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-2 transition-all duration-500"
              style={{ width: `${(completedSteps.size / STEP_ORDER.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {t.completeSetup.progressCount
              .replace("{done}", String(completedSteps.size))
              .replace("{total}", String(STEP_ORDER.length))}
          </p>
        </div>

        <ul className="space-y-1">
          {steps.map((step, idx) => {
            const isComplete = completedSteps.has(step.id);
            const isActive = step.id === activeStep;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive ? "bg-chart-2/10" : "hover:bg-muted/60"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isComplete
                        ? "bg-chart-2 text-white"
                        : isActive
                        ? "border-2 border-chart-2 text-chart-2"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p
                      className={`text-xs ${
                        isComplete
                          ? "text-chart-2"
                          : isActive
                          ? "text-chart-2/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isComplete
                        ? t.completeSetup.stepFiled
                        : isActive
                        ? t.completeSetup.stepInProgress
                        : t.completeSetup.stepNotStarted}
                    </p>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Panel */}
      <div className="flex-1 rounded-3xl border border-chart-2/10 bg-card p-6 shadow-xl shadow-chart-2/5 md:p-8">
        {activeStep === "identity" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-chart-2">
              {t.completeSetup.identityEyebrow}
            </p>
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {t.completeSetup.identityHeading}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-muted-foreground">
              {t.completeSetup.identitySub}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ImageUploader
                label={t.completeSetup.logoLabel}
                aspectHint="1:1 recommended"
                value={store.logo_url ? getStoreMediaUrl(store.logo_url) : undefined}
                onChange={(file) => {
                  setLogoFile(file);
                  setLogoRemoved(file === null && !!store.logo_url);
                }}
              />
              <ImageUploader
                label={t.completeSetup.bannerLabel}
                aspectHint="16:4 recommended"
                value={store.banner_url ? getStoreMediaUrl(store.banner_url) : undefined}
                onChange={(file) => {
                  setBannerFile(file);
                  setBannerRemoved(file === null && !!store.banner_url);
                }}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <PillField
                id="storeName"
                label={t.admin.storeMgmtStoreName}
                value={storeName}
                onChange={setStoreName}
              />
              <PillField
                id="storeSlug"
                label={t.admin.storeMgmtStoreSlug}
                value={storeSlugValue}
                onChange={setStoreSlugValue}
              />
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleSaveIdentity}
                disabled={saving}
                className={primaryBtn}
              >
                {saving ? t.completeSetup.savingBtn : t.completeSetup.saveContinue}
              </button>
            </div>
          </>
        )}

        {activeStep === "description" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-chart-2">
              {t.completeSetup.step1Eyebrow}
            </p>
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {t.completeSetup.step1Heading}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-muted-foreground">
              {t.completeSetup.step1Sub}
            </p>

            <div className="space-y-6">
              <PillField
                id="tagline"
                label={t.completeSetup.taglineLabel}
                value={tagline}
                onChange={setTagline}
                placeholder={t.completeSetup.taglinePlaceholder}
                maxLength={160}
              />
              <PillTextArea
                id="description"
                label={t.completeSetup.descriptionLabel}
                value={description}
                onChange={setDescription}
                placeholder={t.completeSetup.descriptionPlaceholder}
                rows={4}
              />
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={saving}
                className={primaryBtn}
              >
                {saving ? t.completeSetup.savingBtn : t.completeSetup.saveContinue}
              </button>
            </div>
          </>
        )}

        {activeStep === "settings" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-chart-2">
              {t.completeSetup.step2Eyebrow}
            </p>
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {t.completeSetup.step2Heading}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-muted-foreground">
              {t.completeSetup.step2Sub}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <PillShell label={t.completeSetup.currencyLabel} tooltip={t.completeSetup.currencyTip}>
                <CurrencySelect
                  value={String(settings.currency)}
                  onValueChange={() => {}}
                  lockToCurrency="BDT"
                  className="h-12 w-full rounded-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
                />
              </PillShell>
              <PillField
                id="taxRate"
                type="number"
                label={t.completeSetup.taxRateLabel}
                value={taxRate}
                onChange={setTaxRate}
              />
              <PillField
                id="minOrder"
                type="number"
                label={t.admin.storeMgmtMinOrder}
                value={minOrder}
                onChange={setMinOrder}
              />
              <PillField
                id="processingDays"
                type="number"
                label={t.admin.storeMgmtProcessingTime}
                value={processingDays}
                onChange={setProcessingDays}
              />
              <PillField
                id="returnDays"
                type="number"
                label={t.admin.storeMgmtReturnWindow}
                value={returnDays}
                onChange={setReturnDays}
              />
              <PillField
                id="freeShippingAt"
                type="number"
                label={t.admin.storeMgmtFreeShipping}
                value={freeShippingAt}
                onChange={setFreeShippingAt}
              />
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className={primaryBtn}
              >
                {saving ? t.completeSetup.savingBtn : t.completeSetup.saveContinue}
              </button>
            </div>
          </>
        )}

        {activeStep === "social" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-chart-2">
              {t.completeSetup.step3Eyebrow}
            </p>
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {t.completeSetup.step3Heading}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-muted-foreground">
              {t.completeSetup.step3Sub}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <PillField
                id="facebook"
                label="Facebook"
                value={facebook}
                onChange={setFacebook}
                placeholder="https://facebook.com/your-page"
              />
              <PillField
                id="instagram"
                label="Instagram"
                value={instagram}
                onChange={setInstagram}
                placeholder="https://instagram.com/your-handle"
              />
              <PillField
                id="twitter"
                label="X / Twitter"
                value={twitter}
                onChange={setTwitter}
                placeholder="https://x.com/your-handle"
              />
              <PillField
                id="youtube"
                label="YouTube"
                value={youtube}
                onChange={setYoutube}
                placeholder="https://youtube.com/@your-channel"
              />
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleSaveSocial}
                disabled={saving}
                className={primaryBtn}
              >
                {saving ? t.completeSetup.savingBtn : t.completeSetup.saveContinue}
              </button>
            </div>
          </>
        )}

        {activeStep === "shipping" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-chart-2">
              {t.completeSetup.step4Eyebrow}
            </p>
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {t.completeSetup.step4Heading}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-muted-foreground">
              {t.completeSetup.step4Sub}
            </p>

            <div className="mb-8">
              <ShippingManager storeSlug={storeSlug} />
            </div>

            <button
              type="button"
              onClick={() => markComplete("shipping")}
              className={secondaryBtn}
            >
              {t.completeSetup.continueBtn}
            </button>
          </>
        )}

        {activeStep === "policies" && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-chart-2">
              {t.completeSetup.step5Eyebrow}
            </p>
            <h2 className="mb-1 text-2xl font-semibold text-foreground">
              {t.completeSetup.step5Heading}
            </h2>
            <p className="mb-6 max-w-lg text-sm text-muted-foreground">
              {t.completeSetup.step5Sub}
            </p>

            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-semibold text-chart-2">
                  {t.completeSetup.termsLabel}
                </p>
                <RichTextController value={terms} onChange={setTerms} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-chart-2">
                  {t.completeSetup.privacyLabel}
                </p>
                <RichTextController value={privacy} onChange={setPrivacy} />
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleSavePolicies}
                disabled={saving}
                className={primaryBtn}
              >
                {saving ? t.completeSetup.savingBtn : t.completeSetup.saveContinue}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
