"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input, Button, Space } from "antd";
import React from "react";

interface Props {
  showForm: boolean;
  toggleForm: () => void;
  isLgUp: boolean;
  searchText: string;
  setSearchText: (text: string) => void;
}

export default function CategoryTopBar({
  showForm,
  toggleForm,
  isLgUp,
  searchText,
  setSearchText,
}: Props) {
  return (
    <div
      className={`flex ${
        isLgUp ? "flex-row items-center justify-between" : "flex-col gap-2"
      }`}
    >
      {/* Search Box */}
      <Space.Compact style={{ width: isLgUp ? 250 : "100%" }}>
        <Input
          placeholder="Search by name or description"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Button type="primary"><SearchOutlined /></Button>
      </Space.Compact>

      {/* Create/Close Button */}
      <Button
        type="primary"
        danger={showForm}
        onClick={toggleForm}
        className={isLgUp ? "" : "w-full"}
      >
        {showForm ? "Close Form" : "Create Category"}
      </Button>
    </div>
  );
}
