"use client";

import React, { useState } from "react";
import {
  createDemoRequest,
  DemoRequestPayload,
} from "@/lib/queries/demoRequest/demoRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

export default function DemoRequestForm() {
  const [form, setForm] = useState<DemoRequestPayload>({
    full_name: "",
    email: "",
    company_name: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const { success, error } = useSheiNotification();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createDemoRequest(form);
      success("Demo request submitted successfully!");
      setForm({ full_name: "", email: "", company_name: "", message: "" });
    } catch (err) {
      console.error(err);
      error("Failed to submit demo request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 md:px-0 mt-6 sm:mt-10">
      <div className=" shadow-lg rounded-xl p-6 sm:p-8 w-full max-w-lg sm:max-w-xl border">
        <h2 className="text-xl sm:text-2xl font-semibold text-center mb-5 sm:mb-6">
          Request a Demo
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-1">
            <label className="block font-medium text-sm">Full Name</label>
            <Input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-sm">Email</label>
            <Input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-sm">Company Name</label>
            <Input
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-sm">Message</label>
            <Textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              className="min-h-[120px]"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-base"
          >
            {loading ? "Submitting..." : "Request Demo"}
          </Button>
        </form>
      </div>
    </div>
  );
}
