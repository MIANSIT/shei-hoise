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
    <Editor
      initialValue={value ?? ""}
      onBlur={onChange}
    />
  );
}
