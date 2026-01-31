"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // verify recovery session exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMsg("Invalid or expired reset link");
      }
    });
  }, []);

  const handleUpdate = async () => {
    if (password !== confirm) {
      setMsg("Passwords do not match");
      return;
    }

    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) setMsg(error.message);
    else {
      setMsg("Password updated successfully!");
      setSuccess(true);
      setTimeout(() => router.push("/admin-login"), 2000);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="grow flex justify-center items-start mt-24 px-4 mb-24">
        <Card className="w-full max-w-md shadow-lg border border-background-secondary">
          <CardHeader>
            <CardTitle className="text-center text-lg font-semibold">
              Set New Password
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* New Password */}
            <div className="flex flex-col space-y-1">
              <Label htmlFor="password" className="text-primary font-medium">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col space-y-1">
              <Label htmlFor="confirm" className="text-primary font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>

            {/* Messages */}
            {msg && (
              <p
                className={`text-sm ${
                  success ? "text-green-600" : "text-red-500"
                } text-center`}
              >
                {msg}
              </p>
            )}

            {/* Update Button */}
            <Button
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
              disabled={loading}
              onClick={handleUpdate}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
