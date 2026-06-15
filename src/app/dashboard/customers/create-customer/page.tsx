// app/(dashboard)/customers/create/page.tsx
"use client";
import React from "react";
import { Space, Typography, App } from "antd";
import { useRouter } from "next/navigation";
import CustomerCreateForm from "@/app/components/admin/storeCustomers/CustomerCreateForm";
import type { CreateCustomerResponse } from "@/lib/types/customer";
import { useTranslation } from "@/lib/hook/useTranslation";

const { Title, Text } = Typography;

export default function CreateCustomerPage() {
  const router = useRouter();
  const { notification } = App.useApp();
  const t = useTranslation();

  const handleCustomerCreated = (customer: CreateCustomerResponse) => {
    notification.success({
      message: t.admin.createCustSuccessTitle,
      description: `${customer.name} ${t.admin.createCustSuccessDesc}`,
    });

    router.push("/dashboard/customers");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Space orientation="vertical" size="large" className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <Title level={2} className="mb-1">
                {t.admin.createCustPageTitle}
              </Title>
              <Text type="secondary">{t.admin.createCustPageDesc}</Text>
            </div>
          </div>
        </div>

        {/* Customer Creation Form */}
        <div className="">
          <CustomerCreateForm
            onCustomerCreated={handleCustomerCreated}
            showSuccessMessage={false}
            buttonText={t.admin.createCustBtnText}
          />
        </div>
      </Space>
    </div>
  );
}
