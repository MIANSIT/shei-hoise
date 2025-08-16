"use client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SheiAlert, SheiAlertTitle, SheiAlertDescription } from "../../ui/sheiAlert/SheiAlert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationFormSchema, RegistrationFormValues } from "../../../../lib/utils/formSchema";
import { useState } from "react";
import Link from "next/link";
import RegistrationFormBase from "../../auth/RegistrationForm/RegistrationFormFields";

export function RegistrationFormDesktop({ className, ...props }: React.ComponentProps<"div">) {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
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

  const onSubmit = (values: RegistrationFormValues) => {
    console.log("Desktop registration submitted:", values);
    setSuccess(true);
    form.reset();
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-black p-8", className)} {...props}>
      <Card className="w-full max-w-lg mx-auto rounded-xl shadow-lg">
        <CardContent className="p-10">
          <div className="mb-4 text-center">
            <h1 className="text-3xl font-bold text-white">Sign Up</h1>
            <p className="text-base text-muted-foreground mt-1">Create your premium account</p>
          </div>

          {success && (
            <SheiAlert variant="default" className="mb-4 border-green-500 bg-green-50 text-green-800">
              <SheiAlertTitle>Success!</SheiAlertTitle>
              <SheiAlertDescription>Your account has been created successfully.</SheiAlertDescription>
            </SheiAlert>
          )}

          <RegistrationFormBase form={form} onSubmit={onSubmit} />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline hover:text-primary/80">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
