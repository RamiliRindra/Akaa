"use client";

import { Eye, SquarePen } from "lucide-react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeCodeMirrorLanguage,
  CodeToggle,
  codeBlockPlugin,
  codeMirrorPlugin,
  ConditionalContents,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertImage,
  InsertCodeBlock,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { useState } from "react";

import { RichContentRenderer } from "@/components/course/rich-content-renderer";

type MarkdownEditorClientProps = {
  initialMarkdown: string;
  inputName: string;
};

const codeBlockLanguages = {
  txt: "Texte",
  md: "Markdown",
  bash: "Bash",
  json: "JSON",
  js: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  tsx: "TSX",
};

export function MarkdownEditorClient({ initialMarkdown, inputName }: MarkdownEditorClientProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-[#0c0910]/10 bg-white p-1 shadow-[0_12px_24px_-20px_rgba(12,9,16,0.35)]">
        <button
          type="button"
          onClick={() => setActiveView("edit")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeView === "edit"
              ? "bg-[#0F63FF] text-white"
              : "text-[#0c0910]/70 hover:bg-[#0F63FF]/6"
          }`}
        >
          <SquarePen className="h-4 w-4" />
          Édition
        </button>
        <button
          type="button"
          onClick={() => setActiveView("preview")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeView === "preview"
              ? "bg-[#0F63FF] text-white"
              : "text-[#0c0910]/70 hover:bg-[#0F63FF]/6"
          }`}
        >
          <Eye className="h-4 w-4" />
          Aperçu
        </button>
      </div>

      <div className={activeView === "edit" ? "block" : "hidden"}>
        <div className="rounded-2xl border border-[#0c0910]/10 bg-white">
          <input type="hidden" name={inputName} value={markdown} readOnly />
          <MDXEditor
            markdown={initialMarkdown}
            onChange={(nextMarkdown) => setMarkdown(nextMarkdown)}
            className="mdxeditor-shell"
            contentEditableClassName="mdxeditor-content"
            placeholder="Rédigez votre chapitre en Markdown riche…"
            plugins={[
              headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              imagePlugin(),
              codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
              codeMirrorPlugin({ codeBlockLanguages }),
              markdownShortcutPlugin(),
              toolbarPlugin({
                toolbarClassName: "mdxeditor-toolbar",
                toolbarContents: () => (
                  <>
                    <UndoRedo />
                    <Separator />
                    <BlockTypeSelect />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <CodeToggle />
                    <Separator />
                    <ListsToggle />
                    <Separator />
                    <CreateLink />
                    <InsertImage />
                    <InsertThematicBreak />
                    <InsertCodeBlock />
                    <ConditionalContents
                      options={[
                        {
                          when: (editor) => editor?.editorType === "codeblock",
                          contents: () => <ChangeCodeMirrorLanguage />,
                        },
                        {
                          fallback: () => null,
                        },
                      ]}
                    />
                  </>
                ),
              }),
            ]}
          />
        </div>
      </div>

      <div className={activeView === "preview" ? "block" : "hidden"}>
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#0c0910]">Aperçu du rendu apprenant</p>
          <RichContentRenderer content={markdown} />
        </div>
      </div>
    </div>
  );
}
