"use client";

import { useMemo } from "react";

import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { SubmitButton } from "@/components/ui/submit-button";
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
        <label className="space-y-2 text-sm font-medium text-[var(--color-text-dark)]">
          Titre du chapitre
          <input
            name="title"
            defaultValue={title}
            required
            className="form-input text-sm"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[var(--color-text-dark)]">
          Durée estimée (minutes)
          <input
            name="estimatedMinutes"
            type="number"
            min="1"
            defaultValue={estimatedMinutes ?? ""}
            className="form-input text-sm"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-[var(--color-text-dark)]">
        URL vidéo (YouTube ou Google Drive)
        <input
          name="videoUrl"
          type="url"
          defaultValue={videoUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          className="form-input text-sm"
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text-dark)]">Contenu du chapitre</p>
        <MarkdownEditor initialMarkdown={initialMarkdown} inputName="content" />
        <p className="text-xs text-[var(--color-text-dark)]/55">
          Syntaxe supportée v1 : titres, paragraphes, listes, citations, liens, images par URL, séparateurs,
          code inline et blocs de code.
        </p>
      </div>

      <SubmitButton
        className="primary-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
        pendingLabel="Enregistrement..."
      >
        Enregistrer le chapitre
      </SubmitButton>
    </form>
  );
}
