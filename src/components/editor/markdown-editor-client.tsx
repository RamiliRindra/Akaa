"use client";

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

  return (
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
  );
}
