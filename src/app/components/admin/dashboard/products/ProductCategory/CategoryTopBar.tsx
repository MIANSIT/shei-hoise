"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input, Button, Space, Dropdown, Tag, MenuProps } from "antd";
import { useState, useEffect, useRef } from "react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  FilterOutlined,
} from "@ant-design/icons";

interface Props {
  showForm: boolean;
  toggleForm: () => void;
  isLgUp: boolean;
  searchText: string;
  onSearchSubmit: (text: string) => void;
  statusFilter: boolean | null;
  onStatusFilter: (status: boolean | null) => void;
}

export default function CategoryTopBar({
  showForm,
  toggleForm,
  isLgUp,
  searchText,
  onSearchSubmit,
  statusFilter,
  onStatusFilter,
}: Props) {
  const [localSearch, setLocalSearch] = useState(searchText);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  const handleInputChange = (value: string) => {
    setLocalSearch(value);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      onSearchSubmit(value);
      setIsTyping(false);
    }, 500);
  };

  const handleSearchClick = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSearchSubmit(localSearch);
    setIsTyping(false);
  };

  const handleClear = () => {
    setLocalSearch("");
    onSearchSubmit("");
    setIsTyping(false);
  };

  const filterItems: MenuProps["items"] = [
    {
      key: "all",
      label: (
        <div className="flex items-center gap-2">
          <AppstoreOutlined className="text-blue-600" /> All
        </div>
      ),
      onClick: () => onStatusFilter(null),
    },
    {
      key: "active",
      label: (
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-green-600" /> Active
        </div>
      ),
      onClick: () => onStatusFilter(true),
    },
    {
      key: "inactive",
      label: (
        <div className="flex items-center gap-2">
          <CloseCircleOutlined className="text-red-600" /> Inactive
        </div>
      ),
      onClick: () => onStatusFilter(false),
    },
  ];

  const getFilterTag = () => {
    if (statusFilter === true)
      return (
        <Tag
          color="green"
          closable
          onClose={() => onStatusFilter(null)}
          icon={<CheckCircleOutlined />}
        >
          Active
        </Tag>
      );
    if (statusFilter === false)
      return (
        <Tag
          color="red"
          closable
          onClose={() => onStatusFilter(null)}
          icon={<CloseCircleOutlined />}
        >
          Inactive
        </Tag>
      );
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-end">
        {/* Filter Dropdown */}
        <Dropdown
          menu={{ items: filterItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button icon={<FilterOutlined />}>Filter</Button>
        </Dropdown>

        {/* Applied Filter Tag */}
        {getFilterTag()}
      </div>

      <div
        className={`flex ${
          isLgUp ? "flex-row items-center justify-between" : "flex-col gap-2"
        }`}
      >
        {/* Search */}
        <Space.Compact style={{ width: isLgUp ? 250 : "100%" }}>
          <Input
            placeholder="Search by Category Name"
            value={localSearch}
            onChange={(e) => handleInputChange(e.target.value)}
            onPressEnter={() => {
              if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
              onSearchSubmit(localSearch);
              setIsTyping(false);
            }}
            allowClear
            onClear={handleClear}
            suffix={
              isTyping ? <span className="text-xs">Typing...</span> : null
            }
          />
          <Button
            type="primary"
            onClick={handleSearchClick}
            icon={<SearchOutlined />}
          >
            {!isLgUp && "Search"}
          </Button>
        </Space.Compact>

        {/* Create/Close */}
        <Button
          type="primary"
          danger={showForm}
          className={isLgUp ? "" : "w-full"}
          onClick={toggleForm}
        >
          {showForm ? "Close Form" : "Create Category"}
        </Button>
      </div>
    </div>
  );
}
