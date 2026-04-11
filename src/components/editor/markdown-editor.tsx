"use client";

import dynamic from "next/dynamic";

type MarkdownEditorProps = {
  initialMarkdown: string;
  inputName: string;
};

const MarkdownEditorClient = dynamic(
  () => import("./markdown-editor-client").then((module) => module.MarkdownEditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-4 text-sm text-[var(--color-text-dark)]/60">
        Chargement de l’éditeur Markdown…
      </div>
    ),
  },
);

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <MarkdownEditorClient {...props} />;
}
