"use client";

import React, { useState, useEffect } from "react";
import {
  createContactUS,
  ContactUSPayload,
} from "@/lib/queries/contactUS/contactUs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface ContactUSFormProps {
  source?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

export default function ContactUSForm({
  source = "demo_request",
  title = "Request a Demo",
  subtitle = "Fill out the form below and we will get back to you shortly.",
  buttonText = "Request Demo",
}: ContactUSFormProps) {
  const [form, setForm] = useState<ContactUSPayload>({
    full_name: "",
    email: "",
    company_name: "",
    message: "",
    source,
  });

  const [loading, setLoading] = useState(false);
  const { success, error } = useSheiNotification();

  // Update source in case prop changes dynamically
  useEffect(() => {
    setForm((prev) => ({ ...prev, source }));
  }, [source]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createContactUS(form);
      success("Form submitted successfully!");
      setForm({
        full_name: "",
        email: "",
        company_name: "",
        message: "",
        source,
      });
    } catch (err) {
      console.error(err);
      error("Failed to submit form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">
        {title}
      </h2>
      <p className="text-center text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">
        {subtitle}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block font-medium text-sm mb-1">Full Name</label>
          <Input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            className="h-12"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Email</label>
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="h-12"
            placeholder="example@mail.com"
            required
          />
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Company Name</label>
          <Input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            className="h-12"
            placeholder="Acme Corp"
            required
          />
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Message</label>
          <Textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            className="min-h-[100px] p-2 sm:p-3"
            placeholder="Your message..."
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base font-medium"
          variant="greenish"
        >
          {loading ? "Submitting..." : buttonText}
        </Button>
      </form>
    </div>
  );
}
