"use client";

import type { Editor } from "@tiptap/react";

type ButtonProps = {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({ label, shortcut, active, disabled, onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep focus (and the selection) in the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors disabled:opacity-40 ${
        active
          ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
          : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />;

type BlockStyle = "paragraph" | "h1" | "h2" | "h3";

function currentBlock(editor: Editor): BlockStyle {
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive("heading", { level })) return `h${level}`;
  }
  return "paragraph";
}

export default function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();

  const setBlock = (value: BlockStyle) => {
    if (value === "paragraph") chain().setParagraph().run();
    else chain().setHeading({ level: Number(value[1]) as 1 | 2 | 3 }).run();
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-xl border border-ink-200 bg-surface px-2 py-1.5 shadow-sm dark:border-ink-800"
    >
      <ToolbarButton label="Undo" shortcut="Ctrl+Z" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton label="Redo" shortcut="Ctrl+Shift+Z" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
        ↷
      </ToolbarButton>
      <Divider />

      <select
        aria-label="Text style"
        value={currentBlock(editor)}
        onChange={(e) => setBlock(e.target.value as BlockStyle)}
        className="h-8 rounded-md bg-transparent px-1.5 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
      >
        <option value="paragraph">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <Divider />

      <ToolbarButton label="Bold" shortcut="Ctrl+B" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton label="Italic" shortcut="Ctrl+I" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton label="Underline" shortcut="Ctrl+U" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarButton>
      <Divider />

      <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
    </div>
  );
}
