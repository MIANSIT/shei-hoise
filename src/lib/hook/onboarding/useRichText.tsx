"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), {
  ssr: false,
});

interface UseRichTextProps {
  initialValue?: string;
}

export const useRichText = ({ initialValue = "" }: UseRichTextProps = {}) => {
  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Start typing...",
      height: 300,
      toolbarAdaptive: false,
      toolbarButtonSize: "middle" as const,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "outdent",
        "indent",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "left",
        "center",
        "right",
        "justify",
        "|",
        "hr",
        "|",
        "link",
        "|",
        "undo",
        "redo",
        "|",
        "preview",
      ],
      removeButtons: ["source", "about"],
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
    }),
    []
  );

  const Editor = ({
    value,
    onChange,
  }: {
    value?: string | null;
    onChange: (val: string) => void;
  }) => {
    const [content, setContent] = useState<string>(value ?? initialValue ?? "");

    useEffect(() => {
      if (value !== undefined && value !== null && value !== content) {
        setContent(value);
      }
    }, [value, content]);

    return (
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <JoditEditor
          value={content}
          config={editorConfig}
          onBlur={(newContent: string) => {
            setContent(newContent);
            onChange(newContent);
          }}
        />
      </div>
    );
  };

  return { Editor };
};
