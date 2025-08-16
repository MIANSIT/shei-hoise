"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  formSchema,
  SignUpFormValues,
} from "../../../../lib/utils/formSchema";
import { useState } from "react";
import { SignUpMobile } from "./SignUpMobile";
import { SignUpDesktop } from "./SignUpDesktop";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";

interface SignUpContainerProps {
  isMobile: boolean;
}

export function SignUpContainer({ isMobile }: SignUpContainerProps) {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const sheiNotification = useSheiNotification();

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      console.log("Submitting form:", values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      form.reset();
      sheiNotification.success("Registration successful!", { duration: 3000 });
    } catch (error) {
      console.error("Registration failed:", error);
      sheiNotification.error("Registration failed. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const commonProps = {
    form,
    onSubmit,
    isLoading,
  };

  return (
    <>
      <div className="block md:hidden">
        <SignUpMobile {...commonProps} />
      </div>
      <div className="hidden md:block">
        <SignUpDesktop {...commonProps} />
      </div>
    </>
  );
}
