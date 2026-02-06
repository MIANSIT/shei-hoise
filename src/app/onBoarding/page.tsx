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

export default function StoreCreatePage() {
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();
  const router = useRouter();

  const handleCreateStore = async (
    values: CreateUserType,
    resetForm: () => void,
  ) => {
    setLoading(true);
    try {
      const payload = createUserSchema.parse(values);
      await createUser(payload);
      notify.success("Store owner created successfully!");
      resetForm();
      router.push("/admin-login");
    } catch (err: unknown) {
      console.error(err);

      if (
        err instanceof Error &&
        err.message === DomainErrorCode.EMAIL_EXISTS
      ) {
        notify.error("Email already registered");
      } else {
        notify.error("Failed to create store owner");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Main: fills remaining height, prevents full-page scroll */}
      <main className="flex-1 flex justify-center overflow-hidden ">
        <StoreCreateForm onSubmit={handleCreateStore} loading={loading} />
      </main>

      <Footer />
    </div>
  );
}
