"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpFormSchema, SignUpFormValues } from "../../../../lib/utils/formSchema";
import { useState } from "react";
import { SignUpMobile } from "./SignUpMobile";
import { SignUpDesktop } from "./SignUpDesktop";

interface SignUpContainerProps {
  isMobile: boolean;
}

export function SignUpContainer({ isMobile }: SignUpContainerProps) {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      // Replace with your actual API call
      console.log("Submitting form:", values);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess(true);
      form.reset();
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const commonProps = {
    form,
    onSubmit,
    isLoading,
    success,
    setSuccess,
  };

  return isMobile ? (
    <SignUpMobile {...commonProps} />
  ) : (
    <SignUpDesktop {...commonProps} />
  );
}