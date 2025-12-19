"use client";

import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { Input, Button, Space } from "antd";
import { useState, useEffect, useRef } from "react";
import MobileFilter from "@/app/components/admin/common/MobileFilter"; // adjust path if needed

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

  const filterOptions = ["all", "active", "inactive"] as const;
  const getFilterLabel = (opt: string): string => {
    switch (opt) {
      case "all":
        return "All";
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      default:
        return opt;
    }
  };
  const filterValue =
    statusFilter === true
      ? "active"
      : statusFilter === false
      ? "inactive"
      : "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-end">
        {isLgUp ? (
          // Desktop: buttons for All / Active / Inactive
          <div className="flex gap-2">
            {filterOptions.map((opt) => (
              <Button
                key={opt}
                type={filterValue === opt ? "primary" : "default"}
                icon={
                  opt === "active" ? (
                    <CheckCircleOutlined />
                  ) : opt === "inactive" ? (
                    <CloseCircleOutlined />
                  ) : (
                    <AppstoreOutlined />
                  )
                }
                onClick={() => {
                  if (opt === "all") onStatusFilter(null);
                  if (opt === "active") onStatusFilter(true);
                  if (opt === "inactive") onStatusFilter(false);
                }}
              >
                {getFilterLabel(opt)}
              </Button>
            ))}
          </div>
        ) : (
          // Mobile: reusable MobileFilter
          <MobileFilter
            value={filterValue}
            defaultValue="all"
            options={[...filterOptions]}
            onChange={(val) => {
              if (val === "all") onStatusFilter(null);
              if (val === "active") onStatusFilter(true);
              if (val === "inactive") onStatusFilter(false);
            }}
            getLabel={getFilterLabel}
          />
        )}

        {/* Applied Filter Tag */}
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
          />
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
