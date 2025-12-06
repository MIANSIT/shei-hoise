"use client";

import { Input, Button } from "antd";
import React from "react";

const { Search } = Input;

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
      {/* Search Box replaces the title */}
      <Search
        placeholder="Search by name or description"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        enterButton
        style={{ width: isLgUp ? 250 : "100%" }}
      />

      {/* Button */}
      <Button
        type="primary"
        danger={showForm} // red = close, green = create
        onClick={toggleForm}
        className={isLgUp ? "" : "w-full"} // full width on mobile
      >
        {showForm ? "Close Form" : "Create Category"}
      </Button>
    </div>
  );
}
