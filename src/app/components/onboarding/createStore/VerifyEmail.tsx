"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { MailCheck, ShieldCheck, AlertCircle } from "lucide-react";
import { OtpCodeInput } from "../../common/OtpCodeInput";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { DomainErrorCode } from "@/lib/errors/domainErrors";
import {
  sendOnboardingVerificationCode,
  verifyOnboardingVerificationCode,
} from "@/lib/queries/onboarding/emailVerification";

const RESEND_COOLDOWN_SECONDS = 45;

interface Props {
  email: string;
  onValidationChange?: (isVerified: boolean) => void;
}

export default function VerifyEmail({ email, onValidationChange }: Props) {
  const t = useTranslation();
  const notify = useSheiNotification();

  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [shakeTrigger, setShakeTrigger] = useState(0);

  // If the owner goes back and edits their email, whatever was already sent
  // or verified belonged to the old address — reset and make them redo it.
  const verifiedForEmail = useRef<string | null>(null);
  useEffect(() => {
    if (verifiedForEmail.current && verifiedForEmail.current !== email) {
      setIsVerified(false);
      setCodeSent(false);
      setCode("");
      setError("");
      onValidationChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const errorMessages: Record<string, string> = {
    [DomainErrorCode.EMAIL_EXISTS]: t.onboarding.emailExists,
    [DomainErrorCode.RESEND_TOO_SOON]: t.onboarding.verifyResendTooSoon,
    [DomainErrorCode.CODE_NOT_FOUND]: t.onboarding.verifyCodeNotFound,
    [DomainErrorCode.CODE_EXPIRED]: t.onboarding.verifyCodeExpired,
    [DomainErrorCode.CODE_INVALID]: t.onboarding.verifyCodeInvalid,
    [DomainErrorCode.CODE_TOO_MANY_ATTEMPTS]: t.onboarding.verifyTooManyAttempts,
  };

  const messageFor = (err: unknown, fallback: string) =>
    err instanceof Error && errorMessages[err.message]
      ? errorMessages[err.message]
      : fallback;

  const handleSendCode = async () => {
    if (!email) {
      notify.error(t.onboarding.verifyEmailRequired);
      return;
    }
    setSending(true);
    setError("");
    try {
      await sendOnboardingVerificationCode(email);
      setCodeSent(true);
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      notify.success(t.onboarding.verifyCodeSent);
    } catch (err) {
      notify.error(messageFor(err, t.onboarding.verifySendFailed));
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async (codeOverride?: string) => {
    const codeToVerify = codeOverride ?? code;
    if (codeToVerify.length !== 6) {
      setError(t.onboarding.verifyCodeLength);
      setShakeTrigger((n) => n + 1);
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await verifyOnboardingVerificationCode(email, codeToVerify);
      verifiedForEmail.current = email;
      setIsVerified(true);
      onValidationChange?.(true);
      notify.success(t.onboarding.verifySuccess);
    } catch (err) {
      const message = messageFor(err, t.onboarding.verifyCodeInvalid);
      setError(message);
      setShakeTrigger((n) => n + 1);
      onValidationChange?.(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-1">{t.onboarding.verifyTitle}</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {t.onboarding.verifySubtitle} <span className="font-medium text-foreground">{email}</span>
      </p>

      {isVerified ? (
        <div className="flex items-start space-x-3 p-4 bg-chart-2/5 rounded-2xl border border-chart-2/15">
          <div className="shrink-0 text-chart-2">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t.onboarding.verifiedTitle}</h4>
            <p className="text-sm text-muted-foreground">{t.onboarding.verifiedDesc}</p>
          </div>
        </div>
      ) : !codeSent ? (
        <Button
          type="primary"
          onClick={handleSendCode}
          loading={sending}
          icon={<MailCheck className="h-4 w-4" />}
          className="rounded-full px-6 font-semibold"
          style={{ backgroundColor: "var(--chart-2)", border: "none" }}
        >
          {t.onboarding.verifySendCode}
        </Button>
      ) : (
        <div className="flex flex-col gap-4 max-w-sm">
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{t.onboarding.verifyCheckSpam}</span>
          </p>

          <div>
            <label className="mb-2 block text-xs font-semibold text-chart-2">
              {t.onboarding.verifyCodeLabel}
            </label>
            <OtpCodeInput
              value={code}
              onChange={(value) => {
                setCode(value);
                if (error) setError("");
              }}
              onComplete={(value) => handleVerifyCode(value)}
              disabled={verifying}
              hasError={!!error}
              shakeTrigger={shakeTrigger}
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="primary"
              onClick={() => handleVerifyCode()}
              loading={verifying}
              className="rounded-full px-6 font-semibold"
              style={{ backgroundColor: "var(--chart-2)", border: "none" }}
            >
              {t.onboarding.verifyButton}
            </Button>
            <Button
              type="link"
              onClick={handleSendCode}
              disabled={cooldown > 0 || sending}
              loading={sending}
            >
              {cooldown > 0
                ? `${t.onboarding.verifyResend} (${cooldown}s)`
                : t.onboarding.verifyResend}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
