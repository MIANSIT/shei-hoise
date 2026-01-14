"use client";

import { useState } from "react";
import { createUserSchema, CreateUserType } from "@/lib/schema/onboarding/user.schema";
import StoreCreateForm from "@/app/components/onboarding/form/StoreCreateForm";
import { createUser } from "@/lib/queries/onboarding/createUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

export default function StoreCreatePage() {
  const [loading, setLoading] = useState(false);
  const notify = useSheiNotification();

  const handleCreateStore = async (
    values: CreateUserType,
    resetForm: () => void
  ) => {
    setLoading(true);
    try {
      const payload = createUserSchema.parse(values); // validate
      await createUser(payload); // ✅ only called on Submit
      notify.success("Store owner created successfully!");
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) notify.error(err.message);
      else notify.error("Failed to create store owner");
    } finally {
      setLoading(false);
    }
  };

  return <StoreCreateForm onSubmit={handleCreateStore} loading={loading} />;
}