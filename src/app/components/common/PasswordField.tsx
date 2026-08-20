// components/common/PasswordField.tsx
"use client";

import { useState } from "react";
import { PillField } from "./PillField";
import { PasswordToggle } from "./PasswordToggle";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  onKeyPress,
  placeholder = "••••••••",
  disabled,
  autoFocus,
  className,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <PillField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      type={show ? "text" : "password"}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      className={className}
      rightElement={
        <PasswordToggle
          show={show}
          onToggle={() => setShow(!show)}
          size={20}
          className="hover:bg-chart-2/10"
        />
      }
    />
  );
}
