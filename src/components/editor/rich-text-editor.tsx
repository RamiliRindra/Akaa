"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Heading1, Heading2, List, ListOrdered, Pilcrow, Redo2, Undo2 } from "lucide-react";
import { useState } from "react";

type RichTextEditorProps = {
  initialContent: string;
  inputName: string;
};

export function RichTextEditor({ initialContent, inputName }: RichTextEditorProps) {
  const [serializedContent, setSerializedContent] = useState(initialContent);
  const editor = useEditor({
    extensions: [StarterKit],
    content: JSON.parse(initialContent),
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      setSerializedContent(JSON.stringify(currentEditor.getJSON()));
    },
    editorProps: {
      attributes: {
        class:
          "min-h-72 rounded-b-2xl border border-t-0 border-[#0c0910]/10 bg-white px-4 py-3 outline-none",
      },
    },
  });

  if (!editor) {
    return <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-4 text-sm text-[#0c0910]/60">Chargement de l’éditeur…</div>;
  }

  const tools = [
    { icon: Heading1, label: "Titre 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: Heading2, label: "Titre 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Pilcrow, label: "Paragraphe", action: () => editor.chain().focus().setParagraph().run() },
    { icon: List, label: "Liste à puces", action: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Liste numérotée", action: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Undo2, label: "Annuler", action: () => editor.chain().focus().undo().run() },
    { icon: Redo2, label: "Rétablir", action: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div className="rounded-2xl">
      <div className="flex flex-wrap gap-2 rounded-t-2xl border border-[#0c0910]/10 bg-[#f7f9ff] p-3">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={tool.action}
            className="inline-flex items-center gap-2 rounded-xl border border-[#0c0910]/10 bg-white px-3 py-2 text-sm font-medium text-[#0c0910] transition hover:bg-[#0F63FF]/5"
          >
            <tool.icon className="h-4 w-4" />
            {tool.label}
          </button>
        ))}
      </div>

      <input type="hidden" name={inputName} value={serializedContent} readOnly />
      <EditorContent editor={editor} />
    </div>
  );
}
