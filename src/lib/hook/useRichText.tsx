"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import JoditEditor from "jodit-react";

interface UseRichTextProps {
  initialValue?: string;
}

export const useRichText = ({ initialValue = "" }: UseRichTextProps = {}) => {
  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Start typing...",
      height: 600,
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
      useSearch: false,
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
    const [content, setContent] = useState(value ?? initialValue);
    const skipNextChange = useRef(false);

    // Sync external value
    useEffect(() => {
      if (value !== content) {
        setContent(value ?? "");
      }
    }, [content, value]);

    return (
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <JoditEditor
          value={content}
          config={editorConfig}
          onBlur={(newContent: string) => {
            if (newContent !== content) {
              setContent(newContent);
              onChange(newContent);
            }
          }}
          onChange={(newContent: string) => {
            // Skip if this is just setting initial value
            if (skipNextChange.current) {
              skipNextChange.current = false;
              return;
            }

            if (newContent !== content) {
              setContent(newContent);
              onChange(newContent);
            }
          }}
        />
      </div>
    );
  };

  return { Editor };
};
