"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserSchema,
  CreateUserType,
} from "@/lib/schema/onboarding/user.schema";
import StoreCreateForm from "@/app/components/onboarding/form/StoreCreateForm";
import { createUser } from "@/lib/queries/onboarding/createUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import Header from "@/app/components/common/Header";
import Footer from "@/app/components/common/Footer";
import { DomainErrorCode } from "@/lib/errors/domainErrors";
import { useTranslation } from "@/lib/hook/useTranslation";
import { supabase } from "@/lib/supabase";

export default function StoreCreatePage() {
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();
  const router = useRouter();
  const t = useTranslation();

  const handleCreateStore = async (values: CreateUserType) => {
    setLoading(true);
    try {
      const payload = createUserSchema.parse(values);
      await createUser(payload);
      notify.success(t.onboarding.createdSuccess);
      notify.info(t.onboarding.welcomeEmailSpamNote, { duration: 7000 });

      // Deliberately not calling resetForm() here — we redirect away right
      // after this, and resetting mid-flight cleared the form's password
      // field while the separate confirm-password field (local state, not
      // form-managed) still held the typed value, flashing a false
      // "passwords do not match" error for the instant before navigation.

      // Sign the merchant straight in instead of bouncing them to a
      // separate login page they'd have to re-enter credentials on.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (signInError) {
        router.push("/admin-login");
        return;
      }

      router.push("/dashboard/complete-setup");
    } catch (err: unknown) {
      console.error(err);

      if (
        err instanceof Error &&
        err.message === DomainErrorCode.EMAIL_EXISTS
      ) {
        notify.error(t.onboarding.emailExists);
      } else if (
        err instanceof Error &&
        err.message === DomainErrorCode.EMAIL_NOT_VERIFIED
      ) {
        notify.error(t.onboarding.verifyRequired);
      } else {
        notify.error(t.onboarding.createFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="relative flex-1 overflow-y-auto bg-linear-to-b from-chart-2/4 via-background to-background">
        {/* Decorative fintech gradient wash */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-badge/10 blur-3xl" />
        </div>

        <div className="relative flex justify-center px-4 py-8 sm:py-12">
          <StoreCreateForm onSubmit={handleCreateStore} loading={loading} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
