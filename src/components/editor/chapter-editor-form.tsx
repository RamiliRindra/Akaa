"use client";

import { useMemo } from "react";

import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { emptyMarkdownDocument, getMarkdownFromStoredContent } from "@/lib/content";

type ChapterEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  courseId: string;
  moduleId: string;
  chapterId: string;
  title: string;
  content: unknown;
  videoUrl?: string | null;
  estimatedMinutes?: number | null;
};

export function ChapterEditorForm({
  action,
  courseId,
  moduleId,
  chapterId,
  title,
  content,
  videoUrl,
  estimatedMinutes,
}: ChapterEditorFormProps) {
  const initialMarkdown = useMemo(() => {
    if (!content) {
      return emptyMarkdownDocument;
    }

    return getMarkdownFromStoredContent(content);
  }, [content]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <input type="hidden" name="chapterId" value={chapterId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Titre du chapitre
          <input
            name="title"
            defaultValue={title}
            required
            className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Durée estimée (minutes)
          <input
            name="estimatedMinutes"
            type="number"
            min="1"
            defaultValue={estimatedMinutes ?? ""}
            className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-[#0c0910]">
        URL vidéo (YouTube ou Google Drive)
        <input
          name="videoUrl"
          type="url"
          defaultValue={videoUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[#0c0910]">Contenu du chapitre</p>
        <MarkdownEditor initialMarkdown={initialMarkdown} inputName="content" />
        <p className="text-xs text-[#0c0910]/55">
          Syntaxe supportée v1 : titres, paragraphes, listes, citations, liens, séparateurs, code inline et blocs
          de code.
        </p>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
      >
        Enregistrer le chapitre
      </button>
    </form>
  );
}
