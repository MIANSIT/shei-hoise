// app/components/admin/customers/PageHeader.tsx
import React from "react";
import { Button, Divider, Input } from "antd";
import { UserAddOutlined } from "@ant-design/icons";

const { Search } = Input;

interface PageHeaderProps {
  onAddCustomer: () => void;
  onSearchChange: (value: string) => void;
}

export function PageHeader({ onAddCustomer, onSearchChange }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Left Title Section */}
        <div className="w-80">
          <Search
            placeholder="Search name, email or phone"
            allowClear
            enterButton
            onChange={(e) => onSearchChange(e.target.value)}
            size="large"
            className="h-12"
          />
        </div>

        {/* Right Section: Search + Button */}
        <div className="flex flex-wrap  gap-3">
          {/* Search */}

          {/* Add Button */}
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            size="large"
            onClick={onAddCustomer}
            className="h-12"
          >
            Add Customer
          </Button>
        </div>
      </div>

      <Divider className="!my-4" />
    </div>
  );
}
