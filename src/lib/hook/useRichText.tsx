"use client";

import { useMemo } from "react";
import JoditEditor from "jodit-react";

export const useRichText = () => {
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
        "|",
        "left",
        "center",
        "right",
        "|",
        "link",
        "|",
        "undo",
        "redo",
      ] as string[],

      removeButtons: ["source", "about"] as string[],

      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
    }),
    []
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
          key={initialValue} // re-init only when opening dialog
          value={initialValue}
          config={editorConfig}
          onBlur={(newContent: string) => {
            onBlur(newContent);
          }}
        />
      </div>
    );
  };

  return { Editor };
};
