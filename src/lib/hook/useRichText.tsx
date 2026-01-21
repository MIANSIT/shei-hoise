"use client";

import { useMemo } from "react";
import JoditEditor from "jodit-react";

export const useRichText = () => {
  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const editorConfig = useMemo(
    () => ({
      readonly: false,
      placeholder: "Start typing...",
      height: 600,
      toolbarAdaptive: false,
      toolbarButtonSize: "middle" as const,

      theme: isDark ? "dark" : "default",

      style: {
        background: isDark ? "#000000" : "#ffffff",
        color: isDark ? "#ffffff" : "#000000",
      },

      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "ul",
        "ol",
        "|",
        "left",
        "center",
        "right",
        "|",
        "link",
        "|",
        "undo",
        "redo",
      ],

      removeButtons: ["source", "about"],

      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
    }),
    [isDark]
  );

  const Editor = ({
    initialValue,
    onBlur,
  }: {
    initialValue: string;
    onBlur: (val: string) => void;
  }) => {
    return (
      <div className="border rounded-md overflow-hidden">
        <JoditEditor
          value={initialValue}
          config={editorConfig}
          onBlur={(newContent: string) => onBlur(newContent)}
        />
      </div>
    );
  };

  return { Editor };
};
