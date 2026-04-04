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
      <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-4 text-sm text-[#0c0910]/60">
        Chargement de l’éditeur Markdown…
      </div>
    ),
  },
);

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <MarkdownEditorClient {...props} />;
}
