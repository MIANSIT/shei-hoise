"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiAlert, SheiAlertTitle, SheiAlertDescription } from "../../ui/shei-alert/alert";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationFormSchema, RegistrationFormValues } from "../../../../lib/utils/formSchema";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function RegistrationFormMobile({ className, ...props }: React.ComponentProps<"div">) {
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

  // Separate states for each password field
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit: SubmitHandler<RegistrationFormValues> = (values) => {
    console.log("Mobile registration submitted:", values);
    setSuccess(true);
    form.reset();
    setTimeout(() => setSuccess(false), 5000); // hide alert after 5s
  };

  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-black p-4", className)} {...props}>
      <Card className="w-full max-w-lg mx-auto rounded-xl shadow-lg">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-white">Sign Up</h1>
            <p className="text-sm text-muted-foreground mt-1">Create your premium account</p>
          </div>

          {/* Success SheiAlert */}
          {success && (
            <SheiAlert variant="default" className="mb-4 border-green-500 bg-green-50 text-green-800">
              <SheiAlertTitle>Success!</SheiAlertTitle>
              <SheiAlertDescription>Your account has been created successfully.</SheiAlertDescription>
            </SheiAlert>
          )}

          {/* Registration Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Text Fields */}
            {["firstName", "lastName", "email", "phone"].map((field) => (
              <div key={field} className="grid gap-2">
                <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                <Input
                  id={field}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  {...form.register(field as keyof RegistrationFormValues)}
                />
                {form.formState.errors[field as keyof RegistrationFormValues] && (
                  <SheiAlert variant="destructive" className="mt-1">
                    <SheiAlertDescription>
                      {form.formState.errors[field as keyof RegistrationFormValues]?.message as string}
                    </SheiAlertDescription>
                  </SheiAlert>
                )}
              </div>
            ))}

            {/* Password Fields */}
            <div className="grid gap-2 relative">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10" // space for eye icon
                  {...form.register("password")}
                />
                <span
                  className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
              {form.formState.errors.password && (
                <SheiAlert variant="destructive" className="mt-1">
                  <SheiAlertDescription>
                    {form.formState.errors.password?.message as string}
                  </SheiAlertDescription>
                </SheiAlert>
              )}
            </div>

            <div className="grid gap-2 relative">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="pr-10"
                  {...form.register("confirmPassword")}
                />
                <span
                  className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
              {form.formState.errors.confirmPassword && (
                <SheiAlert variant="destructive" className="mt-1">
                  <SheiAlertDescription>
                    {form.formState.errors.confirmPassword?.message as string}
                  </SheiAlertDescription>
                </SheiAlert>
              )}
            </div>

            <Button type="submit" className="w-full mt-2">
              Register
            </Button>
          </form>

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
