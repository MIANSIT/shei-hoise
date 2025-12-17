"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input, Button, Space } from "antd";
import React, { useState, useEffect, useRef } from "react";

interface Props {
  showForm: boolean;
  toggleForm: () => void;
  isLgUp: boolean;
  searchText: string;
  onSearchSubmit: (text: string) => void;
}

export default function CategoryTopBar({
  showForm,
  toggleForm,
  isLgUp,
  searchText,
  onSearchSubmit,
}: Props) {
  const [localSearch, setLocalSearch] = useState(searchText);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with URL state
  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  const handleInputChange = (value: string) => {
    setLocalSearch(value);
    setIsTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout for debounced search
    typingTimeoutRef.current = setTimeout(() => {
      onSearchSubmit(value);
      setIsTyping(false);
    }, 500); // 500ms delay for instant search
  };

  const handleSearchClick = () => {
    // Clear any pending timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onSearchSubmit(localSearch);
    setIsTyping(false);
  };

  const handleClear = () => {
    setLocalSearch("");
    onSearchSubmit("");
    setIsTyping(false);

    // Clear any pending timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`flex ${
        isLgUp ? "flex-row items-center justify-between" : "flex-col gap-2"
      }`}
    >
      {/* Search Box */}
      <Space.Compact style={{ width: isLgUp ? 250 : "100%" }}>
        <Input
          placeholder="Search by Category Name"
          value={localSearch}
          onChange={(e) => handleInputChange(e.target.value)}
          onPressEnter={() => {
            // Clear any pending timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
            onSearchSubmit(localSearch);
            setIsTyping(false);
          }}
          allowClear
          onClear={handleClear}
          suffix={isTyping ? <span className="text-xs">Typing...</span> : null}
        />

        <Button
          type="primary"
          onClick={handleSearchClick}
          icon={<SearchOutlined />}
        >
          {!isLgUp && "Search"}
        </Button>
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
