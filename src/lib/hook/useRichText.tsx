"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

const toolbarButton =
  "flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700";
const toolbarButtonActive = "bg-gray-200 dark:bg-gray-700";

function Toolbar({ editor }: { editor: Editor }) {
  const t = useTranslation();

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t.richEditor.linkPrompt, previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-300 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        aria-label={t.richEditor.bold}
        title={t.richEditor.bold}
        className={`${toolbarButton} ${editor.isActive("bold") ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t.richEditor.italic}
        title={t.richEditor.italic}
        className={`${toolbarButton} ${editor.isActive("italic") ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t.richEditor.underline}
        title={t.richEditor.underline}
        className={`${toolbarButton} ${editor.isActive("underline") ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t.richEditor.strikethrough}
        title={t.richEditor.strikethrough}
        className={`${toolbarButton} ${editor.isActive("strike") ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />

      <button
        type="button"
        aria-label={t.richEditor.heading2}
        title={t.richEditor.heading2}
        className={`${toolbarButton} ${editor.isActive("heading", { level: 2 }) ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t.richEditor.heading3}
        title={t.richEditor.heading3}
        className={`${toolbarButton} ${editor.isActive("heading", { level: 3 }) ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />

      <button
        type="button"
        aria-label={t.richEditor.bulletList}
        title={t.richEditor.bulletList}
        className={`${toolbarButton} ${editor.isActive("bulletList") ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t.richEditor.orderedList}
        title={t.richEditor.orderedList}
        className={`${toolbarButton} ${editor.isActive("orderedList") ? toolbarButtonActive : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />

      <button
        type="button"
        aria-label={t.richEditor.link}
        title={t.richEditor.link}
        className={`${toolbarButton} ${editor.isActive("link") ? toolbarButtonActive : ""}`}
        onClick={setLink}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />

      <button
        type="button"
        aria-label={t.richEditor.undo}
        title={t.richEditor.undo}
        className={toolbarButton}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={t.richEditor.redo}
        title={t.richEditor.redo}
        className={toolbarButton}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const proseClasses =
  "prose prose-gray dark:prose-invert max-w-none prose-sm sm:prose-base " +
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 " +
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 " +
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_li]:my-1 " +
  "[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline focus:outline-none";

export const useRichText = () => {
  const Editor = ({
    initialValue,
    onChange,
  }: {
    initialValue: string;
    onChange: (val: string) => void;
  }) => {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
      ],
      content: initialValue,
      editorProps: {
        attributes: { class: `${proseClasses} min-h-40 px-3 py-2` },
      },
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    useEffect(() => {
      if (!editor || editor.isFocused) return;
      if (initialValue !== editor.getHTML()) {
        editor.commands.setContent(initialValue || "", { emitUpdate: false });
      }
    }, [initialValue, editor]);

    if (!editor) return null;

    return (
      <div>
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  };

  return { Editor };
};
