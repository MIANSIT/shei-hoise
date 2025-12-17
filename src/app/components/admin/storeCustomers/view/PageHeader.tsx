import React from "react";
import { Button, Divider, Input, Space } from "antd";
import { UserAddOutlined, SearchOutlined } from "@ant-design/icons";

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
          <Space.Compact className="w-full ">
            <Input
              placeholder="Search name, email or phone"
              allowClear
              onChange={(e) => onSearchChange(e.target.value)}
              size="large"
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={() => {}}
            />
          </Space.Compact>
        </div>

        {/* Right Section: Add Button */}
        <div className="flex flex-wrap gap-3">
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

      <Divider className="my-4!" />
    </div>
  );
}
