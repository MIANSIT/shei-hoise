"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpFormSchema, SignUpFormValues } from "../../../../lib/utils/formSchema";
import { useState } from "react";
import { SignUpMobile } from "./SignUpMobile";
import { SignUpDesktop } from "./SignUpDesktop";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"

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
  })

  const [isLoading, setIsLoading] = useState(false)
  const sheiNotification = useSheiNotification() // 👈 initialize here

  const onSubmit = async (values: SignUpFormValues) => {
    setIsLoading(true)
    try {
      // Replace with your actual API call
      console.log("Submitting form:", values)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
      form.reset()

      // ✅ Success sheiNotification
      sheiNotification.success("Registration successful!", { duration: 3000 })
    } catch (error) {
      console.error("Registration failed:", error)

      // ❌ Error sheiNotification
      sheiNotification.error("Registration failed. Please try again.", { duration: 4000 })
    } finally {
      setIsLoading(false)
    }
  }

  const commonProps = {
    form,
    onSubmit,
    isLoading,
  }

  return isMobile ? <SignUpMobile {...commonProps} /> : <SignUpDesktop {...commonProps} />
}
