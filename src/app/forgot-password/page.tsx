"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) return;

    setLoading(true);
    setError(null);

    const redirectUrl = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) setError(error.message);
    else setSent(true);

    setLoading(false);
  };

  if (sent) {
    return (
      <>
        <Header />
        <div className="flex justify-center mt-24 px-4">
          <Card className="w-full max-w-md shadow-lg border border-gray-200">
            <CardHeader>
              <CardTitle className="text-center text-lg font-semibold">
                Check your email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-700">
                A reset link has been sent. Please check your inbox and spam
                folder.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <Header />

      {/* Main content grows */}
      <main className="grow flex justify-center items-start mt-24 mb-24 px-4">
        <Card className="w-full max-w-md shadow-lg border border-background-secondary">
          <CardHeader>
            <CardTitle className="text-center text-lg font-semibold">
              Forgot Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email field */}
            <div className="flex flex-col space-y-1">
              <Label htmlFor="email" className="text-primary font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer stays at bottom */}
      <Footer />
    </div>
  );
}
