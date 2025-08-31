"use client"

import React from "react"
import { Input } from "@/components/ui/input"

interface StockInputProps {
  value: number
  onChange: (value: number) => void
}

const StockInput: React.FC<StockInputProps> = ({ value, onChange }) => {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-24"
    />
  )
}

export default StockInput
