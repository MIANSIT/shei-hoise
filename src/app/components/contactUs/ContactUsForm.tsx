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
import SuccessModal from "@/app/components/contactUs/SuccessModal";

interface ContactUSFormProps {
  source?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

const blockedEmailKeywords = [
  "example",
  "test",
  "demo",
  "sample",
  "email",
  "abc",
  "xxx",
];

const isValidEmail = (email: string) => {
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(email)) return false;

  const localPart = email.split("@")[0].toLowerCase();
  return !blockedEmailKeywords.some((word) => localPart.includes(word));
};

const isValidPhone = (phone: string) => {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (!/^\d{11}$/.test(cleaned)) return false;
  if (/^0+$/.test(cleaned)) return false;
  return true;
};

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
    phone_number: "",
    message: "",
    source,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const { error } = useSheiNotification();

  useEffect(() => {
    setForm((prev) => ({ ...prev, source }));
  }, [source]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!isValidEmail(form.email))
      newErrors.email = "Please enter a valid business email address.";
    if (!isValidPhone(form.phone_number))
      newErrors.phone_number = "Please enter a valid 11-digit phone number.";
    if (form.full_name.trim().length < 3)
      newErrors.full_name = "Full name must be at least 3 characters.";
    if (form.company_name.trim().length < 2)
      newErrors.company_name = "Company name is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await createContactUS(form);
      setSuccessOpen(true);
      setForm({
        full_name: "",
        email: "",
        company_name: "",
        phone_number: "",
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
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />

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
            placeholder="John Doe"
          />
          {errors.full_name && (
            <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
          )}
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Email</label>
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="xxx@xxxx.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Phone Number</label>
          <Input
            type="tel"
            name="phone_number"
            value={form.phone_number}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (
                !/^\d$/.test(e.key) &&
                ![
                  "Backspace",
                  "Delete",
                  "ArrowLeft",
                  "ArrowRight",
                  "Tab",
                ].includes(e.key)
              ) {
                e.preventDefault();
              }
            }}
            placeholder="01XXXXXXXXX"
            maxLength={12}
          />
          {errors.phone_number && (
            <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>
          )}
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Company Name</label>
          <Input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            placeholder="Acme Corp"
          />
          {errors.company_name && (
            <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>
          )}
        </div>

        <div>
          <label className="block font-medium text-sm mb-1">Message</label>
          <Textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Your message..."
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12"
          variant="greenish"
        >
          {loading ? "Submitting..." : buttonText}
        </Button>
      </form>
    </div>
  );
}
