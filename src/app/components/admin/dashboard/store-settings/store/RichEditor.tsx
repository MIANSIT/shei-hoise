"use client";

import { useState, useEffect, useRef } from "react";
import { useRichText } from "@/lib/hook/useRichText";

export function RichTextController({
  value,
  onChange,
  
}: {
  value?: string | null;
  onChange: (val: string) => void;
}) {
  const { Editor } = useRichText();
  const [local, setLocal] = useState(value ?? "");
  const initialized = useRef(false);

  // Sync external value changes
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setLocal(value ?? "");
    } else if (value !== local) {
      setLocal(value ?? "");
    }
  }, [local, value]);

  // Handle changes from editor with debounce
  const handleChange = (val: string) => {
    setLocal(val);
    onChange(val);
  };

  return <Editor value={local} onChange={handleChange} />;
}