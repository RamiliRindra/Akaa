"use client";

import { useEffect } from "react";

import { startChapterProgressAction } from "@/actions/quiz";

type ChapterProgressTrackerProps = {
  chapterId: string;
  enabled: boolean;
};

export function ChapterProgressTracker({ chapterId, enabled }: ChapterProgressTrackerProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void startChapterProgressAction(chapterId);
  }, [chapterId, enabled]);

  return null;
}
