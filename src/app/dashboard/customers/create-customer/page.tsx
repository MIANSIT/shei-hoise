// app/(dashboard)/customers/create/page.tsx
"use client";
import React from "react";
import { Space, Typography, App } from "antd";
import { useRouter } from "next/navigation";
import CustomerCreateForm from "@/app/components/admin/storeCustomers/CustomerCreateForm";
import type { CreateCustomerResponse } from "@/lib/types/customer";

const { Title, Text } = Typography;

export default function CreateCustomerPage() {
  const router = useRouter();
  const { notification } = App.useApp();

  const handleCustomerCreated = (customer: CreateCustomerResponse) => {
    notification.success({
      message: "Customer Created Successfully",
      description: `${customer.name} has been added to your store.`,
    });

    // Redirect to customers list page
    router.push("/dashboard/customers");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <Title level={2} className="mb-1">
                Create New Customer
              </Title>
              <Text type="secondary">Add a new customer to your store</Text>
            </div>
          </div>
        </div>

        {/* Customer Creation Form */}
        <div className="">
          <CustomerCreateForm
            onCustomerCreated={handleCustomerCreated}
            showSuccessMessage={false}
            buttonText="Create Customer Account"
          />
        </div>
      </Space>
    </div>
  );
}
