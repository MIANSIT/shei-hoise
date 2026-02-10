"use client";

import { Divider, Input, Tooltip } from "antd";
import { Controller, Control } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import UploadImage from "../uploads/UploadImage";
import { FormItemWrapper } from "./FormItemWrapper";
import { SafetyOutlined, InfoCircleOutlined } from "@ant-design/icons";

interface Props {
  control: Control<CreateUserType>;
}

export default function StoreInformation({ control }: Props) {
  return (
    <div className="">
      <h3 className="text-2xl font-semibold mb-2">Store Information</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Fill in your store details. Your data is secure and private.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Store Name */}
        <Controller
          name="store.store_name"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Name
                  <Tooltip title="Enter your business or brand name as you want customers to see it">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder="Enter your store name"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Slug */}
        <Controller
          name="store.store_slug"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Slug
                  <Tooltip title="A unique URL-friendly identifier for your store (e.g., 'my-awesome-store')">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder="Unique store URL slug"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Description */}
        <Controller
          name="store.description"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Description
                  <Tooltip title="Write a brief description of your store, products, and what makes your business unique">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
              className="md:col-span-2"
            >
              <Input.TextArea
                {...field}
                rows={4}
                placeholder="Briefly describe your store"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring resize-none"
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Logo */}
        <Controller
          name="store.logo_url"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Logo
                  <Tooltip title="Upload your store's logo. Recommended: square image, minimum 200x200px, PNG or JPG format">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
            >
              <UploadImage
                field={field}
                label={<span className="text-foreground">Upload Logo</span>}
              />
            </FormItemWrapper>
          )}
        />

        {/* Store Banner (Optional) */}
        <Controller
          name="store.banner_url"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Banner (Optional)
                  <Tooltip title="Upload a banner image for your store page. Recommended: 1200x400px or wider, PNG or JPG format">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
            >
              <UploadImage
                field={field}
                label={<span className="text-foreground">Upload Banner</span>}
              />
            </FormItemWrapper>
          )}
        />

        {/* Contact Email */}
        <Controller
          name="store.contact_email"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Contact Email
                  <Tooltip title="Primary email address where customers can reach your business for inquiries and support">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder="Enter store contact email"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Contact Phone */}
        <Controller
          name="store.contact_phone"
          control={control}
          rules={{ required: "Contact Phone is required" }}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Store Contact Number
                  <Tooltip title="Primary phone number for customer service and business inquiries. Include country code if applicable">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                type="tel"
                placeholder="Enter contact phone"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Business Address */}
        <Controller
          name="store.business_address"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Business Address
                  <Tooltip title="Enter your complete business address including street, city, postal code, and country">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              required
              error={fieldState.error?.message}
              className="md:col-span-2"
            >
              <Input.TextArea
                {...field}
                rows={4}
                placeholder="Enter business address"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring resize-none"
              />
            </FormItemWrapper>
          )}
        />

        {/* Business License */}
        <Controller
          name="store.business_license"
          control={control}
          render={({ field }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Business License (Optional)
                  <Tooltip title="Enter your business license number or registration number if applicable">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
            >
              <Input
                {...field}
                placeholder="Enter business license"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />

        {/* Tax ID */}
        <Controller
          name="store.tax_id"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label={
                <span className="text-foreground flex items-center gap-1">
                  Business Tax ID (Optional)
                  <Tooltip title="Enter your business tax identification number (TIN, VAT number, or equivalent) if applicable">
                    <InfoCircleOutlined className="text-muted-foreground text-xs cursor-help" />
                  </Tooltip>
                </span>
              }
              error={fieldState.error?.message}
            >
              <Input
                {...field}
                placeholder="Enter tax ID"
                className="rounded-lg bg-input text-foreground border-border focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </FormItemWrapper>
          )}
        />
      </div>

      {/* Divider */}
      <Divider className="my-4 border-border" />

      {/* Trust & Security Notice */}
      <div className="flex items-start space-x-3 mt-4 p-4 bg-muted rounded-lg">
        <div className="shrink-0 text-emerald-600">
          <SafetyOutlined className="text-xl" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Your data is secure</h4>
          <p className="text-sm text-muted-foreground">
            All store information you provide is encrypted and safely stored. We
            do not share your data with third parties without your consent.
          </p>
        </div>
      </div>
    </div>
  );
}
