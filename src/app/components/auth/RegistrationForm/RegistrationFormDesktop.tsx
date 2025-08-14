"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SheiAlert,
  SheiAlertDescription,
  SheiAlertTitle,
} from "../../ui/shei-alert/alert";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registrationFormSchema,
  RegistrationFormValues,
} from "../../../../lib/utils/formSchema";
import { useState, useEffect } from "react";

export function RegistrationFormDesktop({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  // Eye icon state for each password field
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const onSubmit: SubmitHandler<RegistrationFormValues> = (values) => {
    console.log("Desktop registration submitted:", values);
    setAlertType("success");
    setAlertMessage("Registration successful!");
  };

  // Show Zod validation errors as alert
  useEffect(() => {
    const errors = form.formState.errors;
    const messages = Object.values(errors)
      .map((err) => ("message" in err ? err.message : null))
      .filter(Boolean) as string[];

    if (messages.length > 0) {
      setAlertType("error");
      setAlertMessage(messages.join(", "));
    }
  }, [form.formState.errors]);

  // Auto-hide alert after 3 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center w-full bg-black px-20",
        className
      )}
      {...props}
    >
      <Card className="w-full max-w-4xl mx-auto rounded-2xl shadow-xl">
        <CardContent className="p-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Sign Up</h1>
            <p className="text-base text-muted-foreground mt-1">
              Create your premium account
            </p>
          </div>

          {/* SheiAlert */}
          {alertMessage && (
            <SheiAlert
              variant={alertType === "success" ? "default" : "destructive"}
              className="mb-6"
            >
              <SheiAlertTitle>
                {alertType === "success" ? "Success" : "Error"}
              </SheiAlertTitle>
              <SheiAlertDescription>{alertMessage}</SheiAlertDescription>
            </SheiAlert>
          )}

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* First Name */}
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                {...form.register("firstName")}
              />
            </div>

            {/* Last Name */}
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" type="text" {...form.register("lastName")} />
            </div>

            {/* Email */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>

            {/* Phone */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...form.register("phone")} />
            </div>

            {/* Password */}
            {/* Password */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  className="pr-10" // add padding so eye doesn't overlap text
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  className="pr-10"
                  {...form.register("confirmPassword")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
              <Button type="submit" className="w-full mt-2">
                Register
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground md:text-base">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary underline hover:text-primary/80"
            >
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
