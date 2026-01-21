"use client";

import { useRichText } from "@/lib/hook/useRichText";

export function RichTextController({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (val: string) => void;
}) {
  const { Editor } = useRichText();

  return (
    <div
      className="
    rounded-md border
    bg-white text-gray-900
    border-gray-300
    dark:bg-gray-900 dark:text-gray-100
    dark:border-gray-700
  "
    >
      <Editor initialValue={value ?? ""} onBlur={onChange} />
    </div>
  );
}
