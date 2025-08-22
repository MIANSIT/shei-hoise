// components/checkout/CheckoutForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheiLoader } from "../ui/SheiLoader";
import { userCheckoutSchema, CheckoutFormValues } from "@/lib/utils/formSchema";
import { CountryFlag } from "../common/CountryFlag";

interface CheckoutFormProps {
  onSubmit: (values: CheckoutFormValues) => void;
  isLoading?: boolean;
}

const CheckoutForm = ({ onSubmit, isLoading = false }: CheckoutFormProps) => {
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(userCheckoutSchema),
    defaultValues: {
      email: "",
      phone: "",
      name: "",
      country: "",
      city: "",
      shippingAddress: "",
      postCode: "",
    },
  });

  const handleSubmit = (values: CheckoutFormValues) => {
    onSubmit(values);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Name (Full Width) */}
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          {...form.register("name")}
          placeholder="John Doe"
          disabled={isLoading}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Email + Phone (Side by Side on Larger Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            {...form.register("email")}
            placeholder="john.doe@example.com"
            type="email"
            disabled={isLoading}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            {...form.register("phone")}
            placeholder="+1 234 567 8900"
            type="tel"
            disabled={isLoading}
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* Country + City + Postal Code (Side by Side on Larger Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <CountryFlag
            value={form.watch("country")}
            onValueChange={(value) => form.setValue("country", value)}
            disabled={isLoading}
          />
          {form.formState.errors.country && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.country.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            {...form.register("city")}
            placeholder="New York"
            disabled={isLoading}
          />
          {form.formState.errors.city && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="postCode">Postal Code</Label>
          <Input
            {...form.register("postCode")}
            placeholder="10001"
            disabled={isLoading}
          />
          {form.formState.errors.postCode && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.postCode.message}
            </p>
          )}
        </div>
      </div>

      {/* Shipping Address (Full Width) */}
      <div className="grid gap-2">
        <Label htmlFor="shippingAddress">Shipping Address</Label>
        <Input
          {...form.register("shippingAddress")}
          placeholder="123 Main St, Apt 4B"
          disabled={isLoading}
        />
        {form.formState.errors.shippingAddress && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.shippingAddress.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
        disabled={isLoading}
      >
        {isLoading ? (
          <SheiLoader
            size="sm"
            loaderColor="white"
            loadingText="Processing..."
          />
        ) : (
          "Continue to Payment"
        )}
      </Button>
    </form>
  );
};

export default CheckoutForm;