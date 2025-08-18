"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card"; // adjust path if needed

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const notify = useSheiNotification(); // our custom hook

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Simulate login process
      console.log("Email:", email, "Password:", password);

      // Show success toast with colored background
      notify.success("Welcome back! You have successfully logged in.");

      // Redirect after login
      router.push("#"); // change path as needed
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);

      // Show error toast with red background
      notify.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Welcome text */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-left text-white">Welcome back</h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your credentials to access your account
        </p>
      </div>

      {/* Login Card */}
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="text-sm h-14"
              />
            </div>

            <div className="grid gap-4">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                required
                className="text-sm h-14"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-white hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
